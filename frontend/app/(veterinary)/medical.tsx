import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Platform,
  Animated,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { api } from "../../src/services/api";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Color Palette 

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
};

// ── Types 

interface MedicineRecord {
  id: string;
  animal_id: string;
  animal_name?: string;
  tag_number?: string;
  medicine_name: string;
  dosage?: string;
  administered_by?: string;
  date: string;
  notes?: string;
  next_due?: string;
  // Extra detail fields
  route_of_administration?: string;
  diagnosis?: string;
  withdrawal_period?: string;
  batch_number?: string;
  manufacturer?: string;
  treatment_duration?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
  vet_name?: string;
  cost?: string;
  side_effects?: string;
  animal_weight?: string;
  temperature?: string;
}

interface InseminationRecord {
  id: string;
  animal_id?: string;
  cow_id?: string;
  animal_name?: string;
  cow_name?: string;
  tag_number?: string;
  bull_name?: string;
  semen_type?: string;
  insemination_date?: string;
  date?: string;
  result?: string;
  notes?: string;
  performed_by?: string;
  worker_name?: string;
  // Extra detail fields
  semen_batch?: string;
  pregnancy_check_date?: string;
  expected_calving_date?: string;
  heat_detection_method?: string;
  synchronization_protocol?: string;
  previous_result?: string;
  insemination_attempt?: number;
  location?: string;
  cost?: string;
  remarks?: string;
  straw_id?: string;
  conception_rate?: string;
}

interface SemenRecord {
  id: string;
  bull_name?: string;
  breed?: string;
  semen_id?: string;
  batch_number?: string;
  quantity?: number;
  unit?: string;
  date?: string;
  expiry_date?: string;
  notes?: string;
  supplier?: string;
  // Extra detail fields
  motility?: string;
  morphology?: string;
  concentration?: string;
  collection_date?: string;
  processing_date?: string;
  storage_location?: string;
  tank_number?: string;
  canister?: string;
  goblet?: string;
  cost_per_dose?: string;
  total_cost?: string;
  certification?: string;
  origin_country?: string;
  bull_id?: string;
  genetic_merit?: string;
}

type MedicalSubTab = "medicine" | "insemination" | "semen";

const IS_IOS = Platform.OS === "ios";
const STATUS_BAR_HEIGHT = IS_IOS ? 0 : (StatusBar.currentHeight ?? 0);

const HEADER_MAX_H = IS_IOS ? 200 : 200 + STATUS_BAR_HEIGHT;
const HEADER_MIN_H = IS_IOS ? 56 : 56 + STATUS_BAR_HEIGHT;
const SUBTAB_H = 52;
const SEARCH_H = 58;
const STICKY_TOTAL = HEADER_MIN_H + SUBTAB_H + SEARCH_H;

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Detail Row 

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value?: string | number | boolean;
}) {
  if (value === undefined || value === null || value === "") return null;
  const displayVal =
    typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <View style={detail.row}>
      <View style={detail.iconWrap}>
        <Ionicons name={icon} size={12} color={C.primary} />
      </View>
      <Text style={detail.label}>{label}:</Text>
      <Text style={detail.value} numberOfLines={2}>
        {displayVal}
      </Text>
    </View>
  );
}

const detail = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 6,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  label: { fontSize: 11, color: C.textMuted, fontWeight: "600", minWidth: 90 },
  value: {
    fontSize: 11,
    color: C.text,
    fontWeight: "500",
    flex: 1,
    lineHeight: 16,
  },
});

// ── Medicine Card 

function MedicineCard({
  record,
  index,
}: {
  record: MedicineRecord;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 340,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 60,
        tension: 75,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity activeOpacity={0.88} onPress={toggle} style={mc.card}>
        {/* Top stripe */}
        <View style={mc.stripe} />

        <View style={mc.topRow}>
          <View style={mc.iconBox}>
            <Ionicons name="medical" size={20} color="#fff" />
          </View>
          <View style={mc.titleBlock}>
            <Text style={mc.medicineName}>{record.medicine_name}</Text>
            <View style={mc.animalRow}>
              <Ionicons name="paw" size={11} color={C.textMuted} />
              <Text style={mc.animalText}>
                {record.animal_name || record.tag_number || "—"}
              </Text>
              {record.tag_number && record.animal_name ? (
                <Text style={mc.tagText}>#{record.tag_number}</Text>
              ) : null}
            </View>
          </View>
          <View style={mc.rightCol}>
            {record.dosage ? (
              <View style={mc.dosageBadge}>
                <Text style={mc.dosageText}>{record.dosage}</Text>
              </View>
            ) : null}
            <Animated.View style={{ transform: [{ rotate }], marginTop: 8 }}>
              <Ionicons name="chevron-down" size={16} color={C.textMuted} />
            </Animated.View>
          </View>
        </View>

        {/* Always-visible footer */}
        <View style={mc.footerRow}>
          <View style={mc.dateChip}>
            <Ionicons name="calendar-outline" size={11} color={C.textMuted} />
            <Text style={mc.dateText}>{formatDate(record.date)}</Text>
          </View>
          {record.next_due ? (
            <View style={[mc.dateChip, mc.dueChip]}>
              <Ionicons name="alarm-outline" size={11} color={C.dark} />
              <Text style={[mc.dateText, { color: C.dark }]}>
                Due: {formatDate(record.next_due)}
              </Text>
            </View>
          ) : null}
          {record.administered_by ? (
            <View style={mc.adminChip}>
              <Ionicons name="person-outline" size={11} color={C.textLight} />
              <Text style={mc.adminText}>{record.administered_by}</Text>
            </View>
          ) : null}
        </View>

        {/* Expanded Details */}
        {expanded && (
          <View style={mc.expandedBox}>
            <View style={mc.divider} />
            <Text style={mc.sectionHead}>
              <Ionicons name="list-outline" size={12} color={C.accent} /> Full
              Details
            </Text>
            <View style={mc.detailGrid}>
              <DetailRow
                icon="medkit-outline"
                label="Medicine"
                value={record.medicine_name}
              />
              <DetailRow
                icon="paw-outline"
                label="Animal"
                value={record.animal_name}
              />
              <DetailRow
                icon="pricetag-outline"
                label="Tag No."
                value={record.tag_number}
              />
              <DetailRow
                icon="fitness-outline"
                label="Dosage"
                value={record.dosage}
              />
              <DetailRow
                icon="arrow-redo-outline"
                label="Route"
                value={record.route_of_administration}
              />
              <DetailRow
                icon="bug-outline"
                label="Diagnosis"
                value={record.diagnosis}
              />
              <DetailRow
                icon="time-outline"
                label="Duration"
                value={record.treatment_duration}
              />
              <DetailRow
                icon="warning-outline"
                label="Withdrawal"
                value={record.withdrawal_period}
              />
              <DetailRow
                icon="barcode-outline"
                label="Batch No."
                value={record.batch_number}
              />
              <DetailRow
                icon="business-outline"
                label="Manufacturer"
                value={record.manufacturer}
              />
              <DetailRow
                icon="person-outline"
                label="Administered By"
                value={record.administered_by}
              />
              <DetailRow
                icon="school-outline"
                label="Vet Name"
                value={record.vet_name}
              />
              <DetailRow
                icon="scale-outline"
                label="Animal Weight"
                value={record.animal_weight}
              />
              <DetailRow
                icon="thermometer-outline"
                label="Temperature"
                value={record.temperature}
              />
              <DetailRow icon="cash-outline" label="Cost" value={record.cost} />
              <DetailRow
                icon="calendar-outline"
                label="Date"
                value={formatDate(record.date)}
              />
              <DetailRow
                icon="alarm-outline"
                label="Next Due"
                value={formatDate(record.next_due)}
              />
              <DetailRow
                icon="refresh-outline"
                label="Follow-up Req."
                value={record.follow_up_required}
              />
              <DetailRow
                icon="calendar-clear-outline"
                label="Follow-up Date"
                value={formatDate(record.follow_up_date)}
              />
              <DetailRow
                icon="alert-circle-outline"
                label="Side Effects"
                value={record.side_effects}
              />
              {record.notes ? (
                <View style={mc.notesBox}>
                  <Ionicons
                    name="document-text-outline"
                    size={11}
                    color={C.textMuted}
                  />
                  <Text style={mc.notesText}>{record.notes}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const mc = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#FFD9BE",
  },
  stripe: { height: 3, backgroundColor: C.primary, opacity: 0.7 },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    paddingBottom: 8,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: { flex: 1, gap: 4 },
  medicineName: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.2,
  },
  animalRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  animalText: { fontSize: 12, color: C.textMuted, fontWeight: "600" },
  tagText: { fontSize: 11, color: C.textLight, fontWeight: "500" },
  rightCol: { alignItems: "flex-end", gap: 2 },
  dosageBadge: {
    backgroundColor: C.card,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  dosageText: { fontSize: 11, color: C.dark, fontWeight: "700" },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dueChip: { backgroundColor: "#FFF0E6" },
  dateText: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  adminChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF8EF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  adminText: { fontSize: 11, color: C.textLight, fontWeight: "500" },
  expandedBox: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: C.card, marginBottom: 12 },
  sectionHead: {
    fontSize: 12,
    fontWeight: "700",
    color: C.accent,
    marginBottom: 10,
  },
  detailGrid: { gap: 0 },
  notesBox: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  notesText: {
    fontSize: 11,
    color: C.textMuted,
    flex: 1,
    lineHeight: 16,
    fontStyle: "italic",
  },
});

// ── Insemination Card ──────────────────────────────────────────────────────────

function InseminationCard({
  record,
  index,
}: {
  record: InseminationRecord;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 340,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 60,
        tension: 75,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const resultColor =
    record.result === "Pregnant" || record.result === "Success"
      ? "#16a34a"
      : record.result === "Failed" || record.result === "Negative"
        ? "#dc2626"
        : C.dark;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity activeOpacity={0.88} onPress={toggle} style={ic.card}>
        <View style={ic.stripe} />
        <View style={ic.topRow}>
          <View style={ic.iconBox}>
            <Ionicons name="heart" size={20} color="#fff" />
          </View>
          <View style={ic.titleBlock}>
            <Text style={ic.cowName}>
              {record.animal_name || record.cow_name || "—"}
            </Text>
            <View style={ic.subRow}>
              {record.tag_number ? (
                <View style={ic.tagChip}>
                  <Ionicons
                    name="pricetag-outline"
                    size={10}
                    color={C.textMuted}
                  />
                  <Text style={ic.tagText}>#{record.tag_number}</Text>
                </View>
              ) : null}
              {record.bull_name ? (
                <View style={ic.bullChip}>
                  <Ionicons name="male" size={10} color={C.dark} />
                  <Text style={ic.bullText}>{record.bull_name}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={ic.rightCol}>
            {record.result ? (
              <View
                style={[
                  ic.resultBadge,
                  {
                    borderColor: resultColor + "44",
                    backgroundColor: resultColor + "18",
                  },
                ]}
              >
                <View style={[ic.dot, { backgroundColor: resultColor }]} />
                <Text style={[ic.resultText, { color: resultColor }]}>
                  {record.result}
                </Text>
              </View>
            ) : null}
            <Animated.View style={{ transform: [{ rotate }], marginTop: 8 }}>
              <Ionicons name="chevron-down" size={16} color={C.textMuted} />
            </Animated.View>
          </View>
        </View>

        <View style={ic.footerRow}>
          <View style={ic.dateChip}>
            <Ionicons name="calendar-outline" size={11} color={C.textMuted} />
            <Text style={ic.dateText}>
              {formatDate(record.insemination_date || record.date)}
            </Text>
          </View>
          {record.semen_type ? (
            <View style={ic.semenChip}>
              <Ionicons name="flask-outline" size={11} color={C.textMuted} />
              <Text style={ic.semenText}>{record.semen_type}</Text>
            </View>
          ) : null}
          {record.performed_by || record.worker_name ? (
            <View style={ic.workerChip}>
              <Ionicons name="person-outline" size={11} color={C.textLight} />
              <Text style={ic.workerText}>
                {record.performed_by || record.worker_name}
              </Text>
            </View>
          ) : null}
        </View>

        {expanded && (
          <View style={ic.expandedBox}>
            <View style={ic.divider} />
            <Text style={ic.sectionHead}>
              <Ionicons name="list-outline" size={12} color={C.accent} /> Full
              Details
            </Text>
            <DetailRow
              icon="paw-outline"
              label="Animal"
              value={record.animal_name || record.cow_name}
            />
            <DetailRow
              icon="pricetag-outline"
              label="Tag No."
              value={record.tag_number}
            />
            <DetailRow
              icon="male-outline"
              label="Bull Name"
              value={record.bull_name}
            />
            <DetailRow
              icon="flask-outline"
              label="Semen Type"
              value={record.semen_type}
            />
            <DetailRow
              icon="barcode-outline"
              label="Straw ID"
              value={record.straw_id}
            />
            <DetailRow
              icon="barcode-outline"
              label="Semen Batch"
              value={record.semen_batch}
            />
            <DetailRow
              icon="checkmark-circle-outline"
              label="Result"
              value={record.result}
            />
            <DetailRow
              icon="trending-up-outline"
              label="Conception Rate"
              value={record.conception_rate}
            />
            <DetailRow
              icon="repeat-outline"
              label="Attempt No."
              value={record.insemination_attempt}
            />
            <DetailRow
              icon="person-outline"
              label="Performed By"
              value={record.performed_by || record.worker_name}
            />
            <DetailRow
              icon="calendar-outline"
              label="Insem. Date"
              value={formatDate(record.insemination_date || record.date)}
            />
            <DetailRow
              icon="calendar-clear-outline"
              label="Preg. Check"
              value={formatDate(record.pregnancy_check_date)}
            />
            <DetailRow
              icon="happy-outline"
              label="Expected Calving"
              value={formatDate(record.expected_calving_date)}
            />
            <DetailRow
              icon="eye-outline"
              label="Heat Detection"
              value={record.heat_detection_method}
            />
            <DetailRow
              icon="sync-outline"
              label="Sync Protocol"
              value={record.synchronization_protocol}
            />
            <DetailRow
              icon="location-outline"
              label="Location"
              value={record.location}
            />
            <DetailRow icon="cash-outline" label="Cost" value={record.cost} />
            <DetailRow
              icon="time-outline"
              label="Prev. Result"
              value={record.previous_result}
            />
            {record.notes ? (
              <View style={ic.notesBox}>
                <Ionicons
                  name="document-text-outline"
                  size={11}
                  color={C.textMuted}
                />
                <Text style={ic.notesText}>{record.notes}</Text>
              </View>
            ) : null}
            {record.remarks ? (
              <View style={[ic.notesBox, { marginTop: 4 }]}>
                <Ionicons
                  name="chatbox-outline"
                  size={11}
                  color={C.textMuted}
                />
                <Text style={ic.notesText}>{record.remarks}</Text>
              </View>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const ic = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#FFD9BE",
  },
  stripe: { height: 3, backgroundColor: C.dark, opacity: 0.6 },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    paddingBottom: 8,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: { flex: 1, gap: 5 },
  cowName: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.2,
  },
  subRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.bg,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagText: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  bullChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF0E6",
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  bullText: { fontSize: 11, color: C.dark, fontWeight: "600" },
  rightCol: { alignItems: "flex-end" },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  resultText: { fontSize: 11, fontWeight: "700" },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateText: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  semenChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF8EF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  semenText: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  workerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  workerText: { fontSize: 11, color: C.textLight, fontWeight: "500" },
  expandedBox: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: C.card, marginBottom: 12 },
  sectionHead: {
    fontSize: 12,
    fontWeight: "700",
    color: C.accent,
    marginBottom: 10,
  },
  notesBox: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  notesText: {
    fontSize: 11,
    color: C.textMuted,
    flex: 1,
    lineHeight: 16,
    fontStyle: "italic",
  },
});

// ── Semen Card 

function SemenCard({ record, index }: { record: SemenRecord; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 340,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 60,
        tension: 75,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <TouchableOpacity activeOpacity={0.88} onPress={toggle} style={sc.card}>
        <View style={sc.stripe} />
        <View style={sc.topRow}>
          <View style={sc.iconBox}>
            <Ionicons name="flask" size={20} color="#fff" />
          </View>
          <View style={sc.titleBlock}>
            <Text style={sc.bullName}>
              {record.bull_name || "Unknown Bull"}
            </Text>
            <View style={sc.subRow}>
              {record.breed ? (
                <View style={sc.breedChip}>
                  <Text style={sc.breedText}>{record.breed}</Text>
                </View>
              ) : null}
              {record.semen_id || record.batch_number ? (
                <View style={sc.batchChip}>
                  <Ionicons
                    name="barcode-outline"
                    size={10}
                    color={C.textMuted}
                  />
                  <Text style={sc.batchText}>
                    {record.semen_id || record.batch_number}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={sc.rightCol}>
            {record.quantity !== undefined ? (
              <View style={sc.qtyBadge}>
                <Text style={sc.qtyText}>{record.quantity}</Text>
                <Text style={sc.qtyUnit}>{record.unit || "doses"}</Text>
              </View>
            ) : null}
            <Animated.View style={{ transform: [{ rotate }], marginTop: 8 }}>
              <Ionicons name="chevron-down" size={16} color={C.textMuted} />
            </Animated.View>
          </View>
        </View>

        <View style={sc.footerRow}>
          <View style={sc.dateChip}>
            <Ionicons name="calendar-outline" size={11} color={C.textMuted} />
            <Text style={sc.dateText}>{formatDate(record.date)}</Text>
          </View>
          {record.expiry_date ? (
            <View style={[sc.dateChip, sc.expChip]}>
              <Ionicons name="alarm-outline" size={11} color="#dc2626" />
              <Text style={[sc.dateText, { color: "#dc2626" }]}>
                Exp: {formatDate(record.expiry_date)}
              </Text>
            </View>
          ) : null}
          {record.supplier ? (
            <View style={sc.supplierChip}>
              <Ionicons name="business-outline" size={11} color={C.textLight} />
              <Text style={sc.supplierText}>{record.supplier}</Text>
            </View>
          ) : null}
        </View>

        {expanded && (
          <View style={sc.expandedBox}>
            <View style={sc.divider} />
            <Text style={sc.sectionHead}>
              <Ionicons name="list-outline" size={12} color={C.accent} /> Full
              Details
            </Text>
            <DetailRow
              icon="male-outline"
              label="Bull Name"
              value={record.bull_name}
            />
            <DetailRow
              icon="pricetag-outline"
              label="Bull ID"
              value={record.bull_id}
            />
            <DetailRow
              icon="ribbon-outline"
              label="Breed"
              value={record.breed}
            />
            <DetailRow
              icon="barcode-outline"
              label="Semen ID"
              value={record.semen_id}
            />
            <DetailRow
              icon="barcode-outline"
              label="Batch No."
              value={record.batch_number}
            />
            <DetailRow
              icon="layers-outline"
              label="Quantity"
              value={
                record.quantity !== undefined
                  ? `${record.quantity} ${record.unit || "doses"}`
                  : undefined
              }
            />
            <DetailRow
              icon="trending-up-outline"
              label="Motility"
              value={record.motility}
            />
            <DetailRow
              icon="stats-chart-outline"
              label="Morphology"
              value={record.morphology}
            />
            <DetailRow
              icon="beaker-outline"
              label="Concentration"
              value={record.concentration}
            />
            <DetailRow
              icon="business-outline"
              label="Supplier"
              value={record.supplier}
            />
            <DetailRow
              icon="globe-outline"
              label="Origin"
              value={record.origin_country}
            />
            <DetailRow
              icon="medal-outline"
              label="Certification"
              value={record.certification}
            />
            <DetailRow
              icon="star-outline"
              label="Genetic Merit"
              value={record.genetic_merit}
            />
            <DetailRow
              icon="calendar-outline"
              label="Collection Date"
              value={formatDate(record.collection_date)}
            />
            <DetailRow
              icon="calendar-outline"
              label="Processing Date"
              value={formatDate(record.processing_date)}
            />
            <DetailRow
              icon="calendar-outline"
              label="Entry Date"
              value={formatDate(record.date)}
            />
            <DetailRow
              icon="alarm-outline"
              label="Expiry Date"
              value={formatDate(record.expiry_date)}
            />
            <DetailRow
              icon="location-outline"
              label="Storage Location"
              value={record.storage_location}
            />
            <DetailRow
              icon="cube-outline"
              label="Tank No."
              value={record.tank_number}
            />
            <DetailRow
              icon="archive-outline"
              label="Canister"
              value={record.canister}
            />
            <DetailRow
              icon="ellipse-outline"
              label="Goblet"
              value={record.goblet}
            />
            <DetailRow
              icon="cash-outline"
              label="Cost/Dose"
              value={record.cost_per_dose}
            />
            <DetailRow
              icon="wallet-outline"
              label="Total Cost"
              value={record.total_cost}
            />
            {record.notes ? (
              <View style={sc.notesBox}>
                <Ionicons
                  name="document-text-outline"
                  size={11}
                  color={C.textMuted}
                />
                <Text style={sc.notesText}>{record.notes}</Text>
              </View>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const sc = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#FFD9BE",
  },
  stripe: { height: 3, backgroundColor: C.accent, opacity: 0.7 },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    paddingBottom: 8,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: { flex: 1, gap: 5 },
  bullName: {
    fontSize: 15,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.2,
  },
  subRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  breedChip: {
    backgroundColor: C.card,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  breedText: { fontSize: 11, color: C.accent, fontWeight: "700" },
  batchChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.bg,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  batchText: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  rightCol: { alignItems: "flex-end" },
  qtyBadge: {
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  qtyText: { fontSize: 16, fontWeight: "900", color: C.dark },
  qtyUnit: {
    fontSize: 9,
    color: C.textMuted,
    fontWeight: "600",
    marginTop: -1,
  },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  expChip: { backgroundColor: "#FFF0F0" },
  dateText: { fontSize: 11, color: C.textMuted, fontWeight: "600" },
  supplierChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  supplierText: { fontSize: 11, color: C.textLight, fontWeight: "500" },
  expandedBox: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: C.card, marginBottom: 12 },
  sectionHead: {
    fontSize: 12,
    fontWeight: "700",
    color: C.accent,
    marginBottom: 10,
  },
  notesBox: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
  },
  notesText: {
    fontSize: 11,
    color: C.textMuted,
    flex: 1,
    lineHeight: 16,
    fontStyle: "italic",
  },
});

// ── Sub-tab config

const SUB_CONFIG = {
  medicine: {
    color: C.primary,
    icon: "medical-outline" as const,
    label: "Medicine",
  },
  insemination: {
    color: C.dark,
    icon: "heart-outline" as const,
    label: "Insemination",
  },
  semen: { color: C.accent, icon: "flask-outline" as const, label: "Semen" },
};

// ── Main Page

export default function MedicalPage() {
  const router = useRouter();
  const [subTab, setSubTab] = useState<MedicalSubTab>("medicine");
  const [medicineRecords, setMedicineRecords] = useState<MedicineRecord[]>([]);
  const [inseminationRecords, setInseminationRecords] = useState<
    InseminationRecord[]
  >([]);
  const [semenRecords, setSemenRecords] = useState<SemenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollThreshold = HEADER_MAX_H - HEADER_MIN_H;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [meds, insem, semen] = await Promise.all([
        api.getVetMedicineRecords().catch(() => []),
        (api.getVetInseminationRecords
          ? api.getVetInseminationRecords()
          : Promise.resolve([])
        ).catch(() => []),
        (api.getVetSemenRecords
          ? api.getVetSemenRecords()
          : Promise.resolve([])
        ).catch(() => []),
      ]);
      setMedicineRecords(Array.isArray(meds) ? meds : []);
      setInseminationRecords(Array.isArray(insem) ? insem : []);
      setSemenRecords(Array.isArray(semen) ? semen : []);
    } catch (e) {
      console.error("MedicalPage load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // Animated header interpolations
  const headerHeight = scrollY.interpolate({
    inputRange: [0, scrollThreshold],
    outputRange: [HEADER_MAX_H, HEADER_MIN_H],
    extrapolate: "clamp",
  });
  const statsOpacity = scrollY.interpolate({
    inputRange: [0, scrollThreshold * 0.6],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const statsTranslate = scrollY.interpolate({
    inputRange: [0, scrollThreshold],
    outputRange: [0, -20],
    extrapolate: "clamp",
  });
  const subTabOpacity = scrollY.interpolate({
    inputRange: [0, scrollThreshold * 0.5, scrollThreshold],
    outputRange: [1, 0, 0],
    extrapolate: "clamp",
  });
  const searchOpacity = scrollY.interpolate({
    inputRange: [0, scrollThreshold * 0.5, scrollThreshold],
    outputRange: [1, 0, 0],
    extrapolate: "clamp",
  });
  const titleScale = scrollY.interpolate({
    inputRange: [0, scrollThreshold],
    outputRange: [1, 0.88],
    extrapolate: "clamp",
  });
  const titleTranslateX = scrollY.interpolate({
    inputRange: [0, scrollThreshold],
    outputRange: [0, -12],
    extrapolate: "clamp",
  });

  const q = searchQuery.toLowerCase().trim();

  const filteredMedicine = medicineRecords.filter(
    (m) =>
      !q ||
      m.medicine_name.toLowerCase().includes(q) ||
      (m.animal_name || "").toLowerCase().includes(q) ||
      (m.tag_number || "").toLowerCase().includes(q),
  );
  const filteredInsem = inseminationRecords.filter(
    (r) =>
      !q ||
      (r.animal_name || "").toLowerCase().includes(q) ||
      (r.cow_name || "").toLowerCase().includes(q) ||
      (r.tag_number || "").toLowerCase().includes(q) ||
      (r.bull_name || "").toLowerCase().includes(q),
  );
  const filteredSemen = semenRecords.filter(
    (r) =>
      !q ||
      (r.bull_name || "").toLowerCase().includes(q) ||
      (r.breed || "").toLowerCase().includes(q) ||
      (r.semen_id || "").toLowerCase().includes(q),
  );

  const cfg = SUB_CONFIG[subTab];

  const renderEmpty = (icon: any, title: string) => (
    <View style={s.centered}>
      <View style={s.emptyIconBox}>
        <Ionicons name={icon} size={32} color={C.textLight} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptySubtitle}>No records found</Text>
    </View>
  );

  const listData =
    subTab === "medicine"
      ? filteredMedicine
      : subTab === "insemination"
        ? filteredInsem
        : filteredSemen;

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      if (subTab === "medicine")
        return <MedicineCard record={item} index={index} />;
      if (subTab === "insemination")
        return <InseminationCard record={item} index={index} />;
      return <SemenCard record={item} index={index} />;
    },
    [subTab],
  );

  const currentTab = subTab;

  return (
    <View style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Animated Header */}
      <Animated.View style={[s.header, { height: headerHeight }]}>
        <LinearGradient
          colors={["#FFEEDE", "#FFF8EF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Decorative blob */}
        <View style={s.blob1} />
        <View style={s.blob2} />

        {/* Top row: back + title */}
        <View
          style={[
            s.headerTopRow,
            { paddingTop: IS_IOS ? 56 : STATUS_BAR_HEIGHT + 16 },
          ]}
        >
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Animated.Text
            style={[
              s.headerTitle,
              {
                transform: [
                  { scale: titleScale },
                  { translateX: titleTranslateX },
                ],
              },
            ]}
            numberOfLines={1}
          >
            Medical Records
          </Animated.Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Stats strip — fades out on scroll */}
        <Animated.View
          style={[
            s.statsStrip,
            {
              opacity: statsOpacity,
              transform: [{ translateY: statsTranslate }],
            },
          ]}
        >
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: C.primary }]}>
              {medicineRecords.length}
            </Text>
            <Ionicons
              name="medical-outline"
              size={11}
              color={C.textMuted}
              style={{ marginTop: 2 }}
            />
            <Text style={s.statLabel}>Medicine</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: C.dark }]}>
              {inseminationRecords.length}
            </Text>
            <Ionicons
              name="heart-outline"
              size={11}
              color={C.textMuted}
              style={{ marginTop: 2 }}
            />
            <Text style={s.statLabel}>Insemination</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={[s.statValue, { color: C.accent }]}>
              {semenRecords.length}
            </Text>
            <Ionicons
              name="flask-outline"
              size={11}
              color={C.textMuted}
              style={{ marginTop: 2 }}
            />
            <Text style={s.statLabel}>Semen</Text>
          </View>
        </Animated.View>

        {/* Sub-tabs */}
        <Animated.View style={[s.subTabRow, { opacity: subTabOpacity }]}>
          {(["medicine", "insemination", "semen"] as MedicalSubTab[]).map(
            (t) => {
              const c = SUB_CONFIG[t];
              const isActive = subTab === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    s.subTab,
                    isActive && {
                      backgroundColor: c.color + "22",
                      borderColor: c.color + "55",
                    },
                  ]}
                  onPress={() => setSubTab(t)}
                  activeOpacity={0.78}
                >
                  <Ionicons
                    name={c.icon}
                    size={13}
                    color={isActive ? c.color : C.textLight}
                  />
                  <Text
                    style={[
                      s.subTabText,
                      { color: isActive ? c.color : C.textLight },
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            },
          )}
        </Animated.View>

        {/* Search */}
        <Animated.View style={[s.searchRow, { opacity: searchOpacity }]}>
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={16} color={C.textLight} />
            <TextInput
              style={s.searchInput}
              placeholder="Search by animal, medicine, bull..."
              placeholderTextColor={C.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color={C.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>

      {/* Content */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={cfg.color} />
          <Text style={s.loadingText}>Loading records...</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={listData}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            s.listContent,
            listData.length === 0 && s.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={cfg.color}
              colors={[cfg.color]}
              progressViewOffset={HEADER_MAX_H}
            />
          }
          ListEmptyComponent={renderEmpty(cfg.icon, `No ${cfg.label} Records`)}
          ListFooterComponent={<View style={{ height: 48 }} />}
          contentInset={{ top: HEADER_MAX_H }}
          contentOffset={{ x: 0, y: -HEADER_MAX_H }}
          automaticallyAdjustContentInsets={false}
        />
      )}
    </View>
  );
}

// ── Styles

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: "#FFD9BE",
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  blob1: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: C.primary,
    opacity: 0.12,
  },
  blob2: {
    position: "absolute",
    top: 60,
    right: 60,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.dark,
    opacity: 0.07,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: "#FFD9BE",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.3,
  },

  // Stats
  statsStrip: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FFD9BE",
    overflow: "hidden",
    marginBottom: 12,
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 10, gap: 2 },
  statDivider: { width: 1, backgroundColor: "#FFD9BE", marginVertical: 10 },
  statValue: { fontSize: 18, fontWeight: "900", letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: C.textMuted, fontWeight: "600" },

  // Sub-tabs
  subTabRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  subTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFD9BE",
    backgroundColor: "#fff",
  },
  subTabText: { fontSize: 11, fontWeight: "700" },

  // Search
  searchRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFD9BE",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.text },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: HEADER_MAX_H + 12 },
  listContentEmpty: { flexGrow: 1 },

  // States
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: HEADER_MAX_H,
  },
  loadingText: { fontSize: 13, color: C.textMuted, fontWeight: "500" },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFD9BE",
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: C.text },
  emptySubtitle: { fontSize: 13, color: C.textMuted, textAlign: "center" },
});
