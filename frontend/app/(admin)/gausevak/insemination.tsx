import React, { useState, useRef, useEffect, useCallback } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  FlatList,
  TextInput,
  Animated,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../../src/services/api";

interface InseminationRecord {
  id: string;
  admin_id: string;
  cowSrNo: string;
  cowName: string;
  inseminationDate: string;
  aiDate?: string;
  pregnancyStatus: boolean;
  pdDone: boolean;
  pregnancyStatusDate?: string;
  doctorName?: string;
  actualCalvingDate?: string;
  heatAfterCalvingDate?: string;
  sire?: string;
  lastCalvingDate?: string;
  lastCalvingCalfGender?: string;
  created_at: string;
}

interface InseminationGroup {
  cowSrNo: string;
  cowName: string;
  records: InseminationRecord[];
}

type SortOption = "newest" | "oldest" | "name_asc" | "name_desc";
type DateRangeOption = "all_time" | "last_week" | "last_month" | "last_year";

interface Cow {
  id: string;
  tag: string;
  name: string;
  breed: string;
  type: string;
  photo?: string;
}

interface FormData {
  inseminationType: "ai" | "natural";
  cowSrNo: string;
  cowName: string;
  inseminationDate: string;
  aiDate: string;
  pregnancyStatus: boolean;
  pdDone: boolean;
  pregnancyStatusDate: string;
  doctorName: string;
  actualCalvingDate: string;
  heatAfterCalvingDate: string;
  sire: string;
  lastCalvingDate: string;
  lastCalvingCalfGender: string;
}

const cowImg = require("../../../assets/images/gir-cow.png");
const bullImg = require("../../../assets/images/bull-cow.png");
const calfImg = require("../../../assets/images/calf-cow.png");

const getAnimalImage = (type?: string) => {
  // ← add this
  if (type === "bull") return bullImg;
  if (type === "newborn") return calfImg;
  return cowImg;
};

const EMPTY_FORM: FormData = {
  inseminationType: "ai",
  cowSrNo: "",
  cowName: "",
  inseminationDate: "",
  aiDate: "",
  pregnancyStatus: false,
  pdDone: false,
  pregnancyStatusDate: "",
  doctorName: "",
  actualCalvingDate: "",
  heatAfterCalvingDate: "",
  sire: "",
  lastCalvingDate: "",
  lastCalvingCalfGender: "",
};

const PAGE_SIZE = 4;

function calcExpectedCalving(dateStr: string): string {
  if (!dateStr || dateStr.length < 8) return "";
  const parts = dateStr.split("/");
  if (parts.length !== 3) return "";
  const [dd, mm, yyyy] = parts;
  if (!dd || !mm || !yyyy || yyyy.length < 4) return "";
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (isNaN(d.getTime())) return "";
  d.setMonth(d.getMonth() + 9);
  d.setDate(d.getDate() + 9);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getStatus(r: InseminationRecord) {
  if (r.actualCalvingDate)
    return {
      label: "Calved",
      color: "#16a34a",
      bg: "#f0fdf4",
      border: "#86efac",
      icon: "checkmark-circle",
    };
  if (r.pregnancyStatus)
    return {
      label: "Pregnant",
      color: "#7c3aed",
      bg: "#faf5ff",
      border: "#e9d5ff",
      icon: "heart",
    };
  if (r.pdDone)
    return {
      label: "PD Done",
      color: "#0891b2",
      bg: "#ecfeff",
      border: "#a5f3fc",
      icon: "medical",
    };
  return {
    label: "Inseminated",
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fcd34d",
    icon: "time",
  };
}

// ─── InseminationTypeField
function InseminationTypeField({
  value,
  onChange,
}: {
  value: "ai" | "natural";
  onChange: (v: "ai" | "natural") => void;
}) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>INSEMINATION TYPE</Text>
      <View style={f.typeSwitch}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onChange("ai")}
          style={[
            f.typeOption,
            value === "ai" ? f.typeOptionAiActive : f.typeOptionInactive,
          ]}
        >
          <View style={[f.typeIconWrap, value === "ai" && f.typeIconWrapAi]}>
            <Ionicons
              name="flask-outline"
              size={16}
              color={value === "ai" ? "#7c3aed" : "#9ca3af"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[f.typeTitle, value === "ai" && { color: "#7c3aed" }]}>
              AI Insemination
            </Text>
            <Text style={f.typeSub}>Artificial method</Text>
          </View>
          {value === "ai" && (
            <Ionicons name="checkmark-circle" size={18} color="#7c3aed" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onChange("natural")}
          style={[
            f.typeOption,
            value === "natural"
              ? f.typeOptionNaturalActive
              : f.typeOptionInactive,
          ]}
        >
          <View
            style={[
              f.typeIconWrap,
              value === "natural" && f.typeIconWrapNatural,
            ]}
          >
            <Ionicons
              name="leaf-outline"
              size={16}
              color={value === "natural" ? "#16a34a" : "#9ca3af"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[f.typeTitle, value === "natural" && { color: "#15803d" }]}
            >
              Natural Insemination
            </Text>
            <Text style={f.typeSub}>Bull mating method</Text>
          </View>
          {value === "natural" && (
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── CowSelector
function CowSelector({
  value,
  onSelect,
  onClear,
}: {
  value: { tag: string; name: string } | null;
  onSelect: (cow: Cow) => void;
  onClear: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [allCows, setAllCows] = useState<Cow[]>([]);
  const [visibleCows, setVisibleCows] = useState<Cow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const initialLoadDone = useRef(false);

  const loadCows = async (q?: string) => {
    setLoading(true);
    setPage(0);
    try {
      await api.init();
      const data = await api.getCows(q);
      setAllCows(data);
      const first = data.slice(0, PAGE_SIZE);
      setVisibleCows(first);
      setHasMore(data.length > PAGE_SIZE);
    } catch {
      setAllCows([]);
      setVisibleCows([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const nextSlice = allCows.slice(0, (nextPage + 1) * PAGE_SIZE);
    setVisibleCows(nextSlice);
    setPage(nextPage);
    setHasMore(nextSlice.length < allCows.length);
    setLoadingMore(false);
  };

  const open = () => {
    initialLoadDone.current = false;
    setSearch("");
    setModalOpen(true);
    loadCows().then(() => {
      initialLoadDone.current = true;
    });
  };

  const close = () => {
    setModalOpen(false);
    setSearch("");
    setPage(0);
    setAllCows([]);
    setVisibleCows([]);
    initialLoadDone.current = false;
  };

  useEffect(() => {
    if (!modalOpen || !initialLoadDone.current) return;
    const t = setTimeout(() => loadCows(search || undefined), 350);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <>
      <View style={cs.wrap}>
        <Text style={cs.label}>COW SR. NO.</Text>
        {value ? (
          <View style={cs.selected}>
            <View style={cs.selectedLeft}>
              <Text style={cs.selectedTag}>{value.tag}</Text>
              <Text style={cs.selectedName}>{value.name}</Text>
            </View>
            <TouchableOpacity onPress={onClear} style={cs.clearBtn}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={cs.trigger}
            onPress={open}
            activeOpacity={0.8}
          >
            <Ionicons name="search-outline" size={15} color="#9ca3af" />
            <Text style={cs.triggerText}>Search & select a cow...</Text>
            <Ionicons name="chevron-down" size={14} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableOpacity
            style={cs.overlay}
            activeOpacity={1}
            onPress={close}
          >
            <TouchableOpacity
              activeOpacity={1}
              style={cs.sheet}
              onPress={() => {}}
            >
              <View style={cs.sheetHeader}>
                <Text style={cs.sheetTitle}>Select Cow</Text>
                <TouchableOpacity onPress={close} style={cs.sheetClose}>
                  <Ionicons name="close" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <View style={cs.searchRow}>
                <Ionicons name="search-outline" size={15} color="#9ca3af" />
                <TextInput
                  style={cs.searchInput}
                  placeholder="Search tag or name..."
                  placeholderTextColor="#d1d5db"
                  value={search}
                  onChangeText={(text) => {
                    if (initialLoadDone.current) setSearch(text);
                  }}
                  autoFocus={false}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={15} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
              {!loading && allCows.length > 0 && (
                <Text style={cs.countHint}>
                  Showing {visibleCows.length} of {allCows.length} cows
                </Text>
              )}
              {loading ? (
                <View style={cs.loadingWrap}>
                  <ActivityIndicator color="#7c3aed" size="large" />
                  <Text style={cs.loadingText}>Loading cows...</Text>
                </View>
              ) : (
                <FlatList
                  data={visibleCows}
                  keyExtractor={(item) => item.id}
                  style={cs.list}
                  showsVerticalScrollIndicator
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 8 }}
                  onEndReached={loadMore}
                  onEndReachedThreshold={0.5}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={cs.cowRow}
                      onPress={() => {
                        onSelect(item);
                        close();
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={cs.cowEmoji}>
                        {item.photo ? (
                          <Image
                            source={{ uri: item.photo }}
                            style={{ width: 40, height: 40, borderRadius: 10 }}
                            resizeMode="cover"
                          />
                        ) : (
                          <Image
                            source={getAnimalImage(item.type)}
                            style={{
                              width: 26,
                              height: 26,
                              resizeMode: "contain",
                            }}
                          />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={cs.cowTag}>{item.tag}</Text>
                        <Text style={cs.cowName}>
                          {item.name} · {item.breed}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="#d1d5db"
                      />
                    </TouchableOpacity>
                  )}
                  ListFooterComponent={
                    loadingMore ? (
                      <View style={cs.footerLoader}>
                        <ActivityIndicator size="small" color="#7c3aed" />
                        <Text style={cs.footerLoaderText}>Loading more...</Text>
                      </View>
                    ) : hasMore ? (
                      <TouchableOpacity
                        style={cs.loadMoreBtn}
                        onPress={loadMore}
                      >
                        <Ionicons
                          name="chevron-down-circle-outline"
                          size={16}
                          color="#7c3aed"
                        />
                        <Text style={cs.loadMoreText}>
                          Load more ({allCows.length - visibleCows.length}{" "}
                          remaining)
                        </Text>
                      </TouchableOpacity>
                    ) : visibleCows.length > 0 ? (
                      <Text style={cs.endText}>
                        ✓ All {allCows.length} cows loaded
                      </Text>
                    ) : null
                  }
                  ListEmptyComponent={
                    <View style={cs.emptyWrap}>
                      <Image
                        source={cowImg}
                        style={{ width: 60, height: 60, resizeMode: "contain" }}
                      />
                      <Text style={cs.emptyText}>No cows found</Text>
                    </View>
                  }
                />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── Field
function Field({ label, value, onChange, placeholder, icon }: any) {
  const [focused, setFocused] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const isDateField = icon === "calendar-outline";

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const year = selectedDate.getFullYear();
      onChange(`${day}/${month}/${year}`);
    }
  };

  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TouchableOpacity
        activeOpacity={isDateField ? 0.7 : 1}
        onPress={() => {
          if (isDateField) setShowPicker(true);
        }}
      >
        <View style={[f.row, focused && f.focused]}>
          <Ionicons
            name={icon}
            size={15}
            color={focused ? "#7c3aed" : "#9ca3af"}
            style={{ marginRight: 8 }}
            onPress={() => {
              if (isDateField) setShowPicker(true);
            }}
          />
          <TextInput
            style={f.input}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder ?? label}
            placeholderTextColor="#d1d5db"
            editable={!isDateField}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

// ─── LastCalvingDateField
function LastCalvingDateField({
  dateValue,
  genderValue,
  onDateChange,
  onGenderChange,
}: {
  dateValue: string;
  genderValue: string;
  onDateChange: (v: string) => void;
  onGenderChange: (v: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const year = selectedDate.getFullYear();
      onDateChange(`${day}/${month}/${year}`);
    }
  };

  return (
    <View style={f.wrap}>
      <Text style={f.label}>LAST CALVING DATE</Text>
      <TouchableOpacity activeOpacity={0.7} onPress={() => setShowPicker(true)}>
        <View style={[f.row, !!dateValue && f.calvingDateActive]}>
          <Ionicons
            name="calendar-outline"
            size={15}
            color={dateValue ? "#16a34a" : "#9ca3af"}
            style={{ marginRight: 8 }}
          />
          <Text
            style={[
              f.input,
              dateValue ? f.calvingDateText : { color: "#d1d5db" },
            ]}
          >
            {dateValue || "DD/MM/YYYY"}
          </Text>
          {!!dateValue && (
            <TouchableOpacity
              onPress={() => {
                onDateChange("");
                onGenderChange("");
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color="#86efac" />
            </TouchableOpacity>
          )}
          <Ionicons
            name="calendar"
            size={15}
            color={dateValue ? "#16a34a" : "#9ca3af"}
            style={{ marginLeft: 4 }}
          />
        </View>
      </TouchableOpacity>

      {!!dateValue && (
        <View style={gb.container}>
          <View style={gb.headerRow}>
            <Ionicons name="git-branch-outline" size={13} color="#374151" />
            <Text style={gb.headerText}>LAST CALF GENDER</Text>
            {!!genderValue && (
              <View
                style={[
                  gb.selectedBadge,
                  {
                    backgroundColor:
                      genderValue === "male" ? "#dbeafe" : "#fce7f3",
                    borderColor: genderValue === "male" ? "#93c5fd" : "#f9a8d4",
                  },
                ]}
              >
                <Text
                  style={[
                    gb.selectedBadgeText,
                    { color: genderValue === "male" ? "#1d4ed8" : "#be185d" },
                  ]}
                >
                  {genderValue === "male"
                    ? "🐂 Male selected"
                    : "🐄 Female selected"}
                </Text>
              </View>
            )}
          </View>
          <View style={gb.btnRow}>
            <TouchableOpacity
              onPress={() =>
                onGenderChange(genderValue === "male" ? "" : "male")
              }
              style={[
                gb.btn,
                genderValue === "male" ? gb.maleActive : gb.maleInactive,
              ]}
              activeOpacity={0.8}
            >
              {genderValue === "male" && (
                <View style={gb.checkmark}>
                  <Ionicons name="checkmark-circle" size={15} color="#1d4ed8" />
                </View>
              )}
              <View
                style={[
                  gb.iconCircle,
                  {
                    backgroundColor:
                      genderValue === "male" ? "#bfdbfe" : "#f3f4f6",
                    borderColor: genderValue === "male" ? "#93c5fd" : "#e5e7eb",
                  },
                ]}
              >
                <Text style={{ fontSize: 26 }}>🐂</Text>
              </View>
              <Text
                style={[
                  gb.btnLabel,
                  { color: genderValue === "male" ? "#1d4ed8" : "#374151" },
                ]}
              >
                Male
              </Text>
              <Text
                style={[
                  gb.btnSub,
                  { color: genderValue === "male" ? "#3b82f6" : "#9ca3af" },
                ]}
              >
                Bull calf
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                onGenderChange(genderValue === "female" ? "" : "female")
              }
              style={[
                gb.btn,
                genderValue === "female" ? gb.femaleActive : gb.femaleInactive,
              ]}
              activeOpacity={0.8}
            >
              {genderValue === "female" && (
                <View style={gb.checkmark}>
                  <Ionicons name="checkmark-circle" size={15} color="#be185d" />
                </View>
              )}
              <View
                style={[
                  gb.iconCircle,
                  {
                    backgroundColor:
                      genderValue === "female" ? "#fce7f3" : "#f3f4f6",
                    borderColor:
                      genderValue === "female" ? "#f9a8d4" : "#e5e7eb",
                  },
                ]}
              >
                <Text style={{ fontSize: 26 }}>🐄</Text>
              </View>
              <Text
                style={[
                  gb.btnLabel,
                  { color: genderValue === "female" ? "#be185d" : "#374151" },
                ]}
              >
                Female
              </Text>
              <Text
                style={[
                  gb.btnSub,
                  { color: genderValue === "female" ? "#ec4899" : "#9ca3af" },
                ]}
              >
                Heifer calf
              </Text>
            </TouchableOpacity>
          </View>
          {!genderValue && (
            <Text style={gb.hintText}>
              👆 Tap to select the gender of the calf born
            </Text>
          )}
        </View>
      )}

      {showPicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}
    </View>
  );
}

// ─── ToggleCard
function ToggleCard({
  label,
  sub,
  value,
  onChange,
  activeColor,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
  activeColor: string;
}) {
  return (
    <View
      style={[
        f.toggleCard,
        value && {
          borderColor: activeColor + "44",
          backgroundColor: activeColor + "08",
        },
      ]}
    >
      <View style={f.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={f.toggleLabel}>{label}</Text>
          <Text
            style={[f.toggleSub, { color: value ? activeColor : "#9ca3af" }]}
          >
            {sub}
          </Text>
        </View>
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: "#f3f4f6", true: activeColor + "55" }}
          thumbColor={value ? activeColor : "#d1d5db"}
        />
      </View>
    </View>
  );
}

// ─── SectionHeader
function SectionHeader({
  title,
  icon,
  color,
}: {
  title: string;
  icon: string;
  color: string;
}) {
  return (
    <View style={[f.sectionHeader, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={13} color={color} />
      <Text style={[f.sectionTitle, { color }]}>{title}</Text>
    </View>
  );
}

// ─── RecordFormBody
function RecordFormBody({
  form,
  setF,
  onCowSelect,
  onCowClear,
}: {
  form: FormData;
  setF: (k: keyof FormData) => (v: any) => void;
  onCowSelect: (cow: Cow) => void;
  onCowClear: () => void;
}) {
  const selectedCow = form.cowSrNo
    ? { tag: form.cowSrNo, name: form.cowName }
    : null;
  const expectedCalving = calcExpectedCalving(form.inseminationDate);

  return (
    <>
      <SectionHeader
        title="Insemination Type"
        icon="swap-horizontal-outline"
        color="#7c3aed"
      />
      <InseminationTypeField
        value={form.inseminationType}
        onChange={(value) => {
          setF("inseminationType")(value);
          if (value === "ai") setF("sire")("");
        }}
      />

      <SectionHeader
        title="Cow Information"
        icon="paw-outline"
        color="#2563eb"
      />
      <CowSelector
        value={selectedCow}
        onSelect={onCowSelect}
        onClear={onCowClear}
      />

      {form.cowName ? (
        <View style={f.readOnlyWrap}>
          <Text style={f.label}>COW NAME</Text>
          <View style={f.readOnlyRow}>
            <Ionicons
              name="text-outline"
              size={15}
              color="#7c3aed"
              style={{ marginRight: 8 }}
            />
            <Text style={f.readOnlyText}>{form.cowName}</Text>
            <View style={f.autoBadge}>
              <Text style={f.autoBadgeText}>Auto</Text>
            </View>
          </View>
        </View>
      ) : null}

      <SectionHeader
        title="Insemination"
        icon="flask-outline"
        color="#7c3aed"
      />
      <Field
        label="Insemination Date"
        value={form.inseminationDate}
        onChange={setF("inseminationDate")}
        placeholder="DD/MM/YYYY"
        icon="calendar-outline"
      />

      {form.inseminationType === "natural" && (
        <Field
          label="Sire (Bull Name)"
          value={form.sire}
          onChange={setF("sire")}
          placeholder="e.g. HF Bull / Jersey Bull"
          icon="male-outline"
        />
      )}

      <SectionHeader title="Last Calving" icon="star-outline" color="#16a34a" />
      <LastCalvingDateField
        dateValue={form.lastCalvingDate}
        genderValue={form.lastCalvingCalfGender}
        onDateChange={(v) => {
          setF("lastCalvingDate")(v);
          if (!v) setF("lastCalvingCalfGender")("");
        }}
        onGenderChange={setF("lastCalvingCalfGender")}
      />

      {!!expectedCalving && (
        <View style={f.expectedWrap}>
          <Text style={f.label}>EXPECTED CALVING DATE</Text>
          <View style={f.expectedRow}>
            <Ionicons
              name="calendar"
              size={15}
              color="#16a34a"
              style={{ marginRight: 8 }}
            />
            <Text style={f.expectedText}>{expectedCalving}</Text>
            <View style={f.expectedBadge}>
              <Text style={f.expectedBadgeText}>9M + 9D</Text>
            </View>
          </View>
          <Text style={f.expectedHint}>
            Auto-calculated · Insemination + 9 months 9 days
          </Text>
        </View>
      )}

      <SectionHeader
        title="Pregnancy Status"
        icon="heart-outline"
        color="#e11d48"
      />
      <ToggleCard
        label="Pregnancy Status"
        sub={form.pregnancyStatus ? "Cow is pregnant ✓" : "Not confirmed yet"}
        value={form.pregnancyStatus}
        onChange={setF("pregnancyStatus")}
        activeColor="#e11d48"
      />

      <SectionHeader
        title="Pregnancy Determination (PD)"
        icon="medical-outline"
        color="#0891b2"
      />
      <ToggleCard
        label="PD Done"
        sub={form.pdDone ? "PD completed by vet" : "PD not yet done"}
        value={form.pdDone}
        onChange={setF("pdDone")}
        activeColor="#0891b2"
      />
      {form.pdDone && (
        <View style={m.subFields}>
          <Field
            label="PD Date"
            value={form.pregnancyStatusDate}
            onChange={setF("pregnancyStatusDate")}
            placeholder="DD/MM/YYYY"
            icon="calendar-outline"
          />
          <Field
            label="Doctor Name"
            value={form.doctorName}
            onChange={setF("doctorName")}
            placeholder="e.g. Dr. Sharma"
            icon="person-outline"
          />
        </View>
      )}

      <SectionHeader
        title="Calving Details"
        icon="leaf-outline"
        color="#059669"
      />
      <Field
        label="Actual Calving Date"
        value={form.actualCalvingDate}
        onChange={setF("actualCalvingDate")}
        placeholder="DD/MM/YYYY"
        icon="calendar-outline"
      />
      <Field
        label="Heat After Calving Date"
        value={form.heatAfterCalvingDate}
        onChange={setF("heatAfterCalvingDate")}
        placeholder="DD/MM/YYYY"
        icon="calendar-outline"
      />
      <View style={{ height: 12 }} />
    </>
  );
}

// ─── AddModal
function AddModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (r: InseminationRecord) => void;
}) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSub] = useState(false);
  const setF = (k: keyof FormData) => (v: any) =>
    setForm((p) => ({ ...p, [k]: v }));
  const handleCowSelect = (cow: Cow) =>
    setForm((p) => ({ ...p, cowSrNo: cow.tag, cowName: cow.name }));
  const handleCowClear = () =>
    setForm((p) => ({ ...p, cowSrNo: "", cowName: "" }));
  const reset = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  const submit = async () => {
    if (!form.cowSrNo || !form.inseminationDate) {
      Alert.alert(
        "Missing Fields",
        "Please select a cow and enter insemination date.",
      );
      return;
    }
    setSub(true);
    try {
      const payload = {
        cowSrNo: form.cowSrNo,
        cowName: form.cowName,
        inseminationDate: form.inseminationDate,
        aiDate:
          form.inseminationType === "ai"
            ? form.inseminationDate || undefined
            : undefined,
        pregnancyStatus: form.pregnancyStatus,
        pdDone: form.pdDone,
        pregnancyStatusDate: form.pdDone
          ? form.pregnancyStatusDate || undefined
          : undefined,
        doctorName: form.pdDone ? form.doctorName || undefined : undefined,
        actualCalvingDate: form.actualCalvingDate || undefined,
        heatAfterCalvingDate: form.heatAfterCalvingDate || undefined,
        sire:
          form.inseminationType === "natural"
            ? form.sire || undefined
            : undefined,
        lastCalvingDate: form.lastCalvingDate || undefined,
        lastCalvingCalfGender: form.lastCalvingCalfGender || undefined,
      };
      const created = await api.createInsemination(payload);
      onAdd(created);
      reset();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to save record.");
    } finally {
      setSub(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={reset}
    >
      <View style={m.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.header}>
              <View style={m.headerIcon}>
                <Ionicons name="flask" size={18} color="#7c3aed" />
              </View>
              <Text style={m.title}>New Insemination</Text>
              <TouchableOpacity onPress={reset} style={m.closeBtn}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={m.sub}>Fill in the insemination details</Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 480 }}
              keyboardShouldPersistTaps="handled"
            >
              <RecordFormBody
                form={form}
                setF={setF}
                onCowSelect={handleCowSelect}
                onCowClear={handleCowClear}
              />
            </ScrollView>
            <TouchableOpacity
              onPress={submit}
              style={[
                m.submitBtn,
                (!form.cowSrNo || !form.inseminationDate || submitting) && {
                  opacity: 0.45,
                },
              ]}
              disabled={!form.cowSrNo || !form.inseminationDate || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#fff"
                  />
                  <Text style={m.submitText}>Save Record</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── EditModal
function EditModal({
  visible,
  record,
  onClose,
  onSave,
}: {
  visible: boolean;
  record: InseminationRecord | null;
  onClose: () => void;
  onSave: (updated: InseminationRecord) => void;
}) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSub] = useState(false);

  useEffect(() => {
    if (record) {
      setForm({
        inseminationType: record.aiDate ? "ai" : "natural",
        cowSrNo: record.cowSrNo,
        cowName: record.cowName,
        inseminationDate: record.inseminationDate,
        aiDate: record.aiDate ?? record.inseminationDate ?? "",
        pregnancyStatus: record.pregnancyStatus,
        pdDone: record.pdDone,
        pregnancyStatusDate: record.pregnancyStatusDate ?? "",
        doctorName: record.doctorName ?? "",
        actualCalvingDate: record.actualCalvingDate ?? "",
        heatAfterCalvingDate: record.heatAfterCalvingDate ?? "",
        sire: record.sire ?? "",
        lastCalvingDate: record.lastCalvingDate ?? "",
        lastCalvingCalfGender: record.lastCalvingCalfGender ?? "",
      });
    }
  }, [record]);

  const setF = (k: keyof FormData) => (v: any) =>
    setForm((p) => ({ ...p, [k]: v }));
  const handleCowSelect = (cow: Cow) =>
    setForm((p) => ({ ...p, cowSrNo: cow.tag, cowName: cow.name }));
  const handleCowClear = () =>
    setForm((p) => ({ ...p, cowSrNo: "", cowName: "" }));

  const save = async () => {
    if (!record || !form.cowSrNo || !form.inseminationDate) return;
    setSub(true);
    try {
      const payload = {
        cowSrNo: form.cowSrNo,
        cowName: form.cowName,
        inseminationDate: form.inseminationDate,
        aiDate:
          form.inseminationType === "ai"
            ? form.inseminationDate || undefined
            : undefined,
        pregnancyStatus: form.pregnancyStatus,
        pdDone: form.pdDone,
        pregnancyStatusDate: form.pdDone
          ? form.pregnancyStatusDate || undefined
          : undefined,
        doctorName: form.pdDone ? form.doctorName || undefined : undefined,
        actualCalvingDate: form.actualCalvingDate || undefined,
        heatAfterCalvingDate: form.heatAfterCalvingDate || undefined,
        sire:
          form.inseminationType === "natural"
            ? form.sire || undefined
            : undefined,
        lastCalvingDate: form.lastCalvingDate || undefined,
        lastCalvingCalfGender: form.lastCalvingCalfGender || undefined,
      };
      const updated = await api.updateInsemination(record.id, payload);
      onSave(updated);
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message ?? "Failed to update record.");
    } finally {
      setSub(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={m.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
          <View style={m.sheet}>
            <View style={m.handle} />
            <View style={m.header}>
              <View style={[m.headerIcon, { backgroundColor: "#fff7ed" }]}>
                <Ionicons name="create" size={18} color="#ea580c" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={m.title}>Update Record</Text>
                {record && (
                  <Text style={m.editSubName}>
                    {record.cowName} · {record.cowSrNo}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={onClose} style={m.closeBtn}>
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 480 }}
              keyboardShouldPersistTaps="handled"
            >
              <RecordFormBody
                form={form}
                setF={setF}
                onCowSelect={handleCowSelect}
                onCowClear={handleCowClear}
              />
            </ScrollView>
            <TouchableOpacity
              onPress={save}
              style={[
                m.submitBtn,
                { backgroundColor: "#ea580c" },
                (!form.cowSrNo || !form.inseminationDate || submitting) && {
                  opacity: 0.45,
                },
              ]}
              disabled={!form.cowSrNo || !form.inseminationDate || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#fff" />
                  <Text style={m.submitText}>Update Record</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── DetailRow
function DetailRow({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  if (!value) return null;
  return (
    <View style={d.row}>
      <View
        style={[d.iconWrap, { backgroundColor: (color ?? "#6b7280") + "15" }]}
      >
        <Ionicons name={icon as any} size={12} color={color ?? "#6b7280"} />
      </View>
      <Text style={d.label}>{label}</Text>
      <Text style={[d.value, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

// ─── InseminationCard
function InseminationCard({
  group,
  index,
  cowType,
  cowPhoto,
  onEdit,
  onDelete,
}: {
  group: InseminationGroup;
  index: number;
  cowType?: string;
  cowPhoto?: string;
  onEdit: (r: InseminationRecord) => void;
  onDelete: (r: InseminationRecord) => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const [expanded, setExpanded] = useState(false);
  const [recordIndex, setRecordIndex] = useState(0);
  const item = group.records[recordIndex];
  const status = getStatus(item);
  const expectedCalving = calcExpectedCalving(item.inseminationDate);
  const inseminationType = item.aiDate ? "ai" : "natural";
  const hasMultipleRecords = group.records.length > 1;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay: index * 60,
        tension: 70,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    setRecordIndex(0);
  }, [group.cowSrNo]);

  const genderLabel =
    item.lastCalvingCalfGender === "male"
      ? "🐂 Male"
      : item.lastCalvingCalfGender === "female"
        ? "🐄 Female"
        : "";
  const genderColor =
    item.lastCalvingCalfGender === "male"
      ? "#1d4ed8"
      : item.lastCalvingCalfGender === "female"
        ? "#be185d"
        : undefined;

  return (
    <Animated.View style={[c.card, { opacity, transform: [{ translateY }] }]}>
      <TouchableOpacity
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.8}
      >
        <View style={c.topRow}>
          <View style={c.avatar}>
            {cowPhoto ? (
              <Image
                source={{ uri: cowPhoto }}
                style={{ width: 44, height: 44, borderRadius: 12 }}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={getAnimalImage(cowType)}
                style={{ width: 28, height: 28, resizeMode: "contain" }}
              />
            )}
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={c.name}>{item.cowName}</Text>
            <Text style={c.sr}>{item.cowSrNo}</Text>
            {hasMultipleRecords && (
              <Text style={c.historyHint}>
                Record {recordIndex + 1} of {group.records.length}
              </Text>
            )}
            {!!item.sire && <Text style={c.sireLabel}>🐂 {item.sire}</Text>}
          </View>
          <View
            style={[
              c.badge,
              { backgroundColor: status.bg, borderColor: status.border },
            ]}
          >
            <Ionicons
              name={status.icon as any}
              size={11}
              color={status.color}
            />
            <Text style={[c.badgeText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={15}
            color="#d1d5db"
            style={{ marginLeft: 8 }}
          />
        </View>

        <View style={c.pills}>
          <View
            style={[
              c.pill,
              inseminationType === "ai" ? c.typePillAi : c.typePillNatural,
            ]}
          >
            <Ionicons
              name={
                inseminationType === "ai" ? "flask-outline" : "leaf-outline"
              }
              size={10}
              color={inseminationType === "ai" ? "#7c3aed" : "#15803d"}
            />
            <Text
              style={[
                c.pillText,
                { color: inseminationType === "ai" ? "#7c3aed" : "#15803d" },
              ]}
            >
              {inseminationType === "ai" ? "AI" : "Natural"}
            </Text>
          </View>
          <View style={c.pill}>
            <Ionicons name="flask-outline" size={10} color="#7c3aed" />
            <Text style={c.pillText}>{item.inseminationDate}</Text>
          </View>
          {!!expectedCalving && !item.actualCalvingDate && (
            <View
              style={[
                c.pill,
                { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
              ]}
            >
              <Ionicons name="calendar" size={10} color="#16a34a" />
              <Text style={[c.pillText, { color: "#16a34a" }]}>
                Exp. {expectedCalving}
              </Text>
            </View>
          )}
          <View
            style={[
              c.pill,
              {
                backgroundColor: item.pregnancyStatus ? "#fff1f2" : "#f9fafb",
                borderColor: item.pregnancyStatus ? "#fecdd3" : "#e5e7eb",
              },
            ]}
          >
            <Ionicons
              name="heart"
              size={10}
              color={item.pregnancyStatus ? "#e11d48" : "#9ca3af"}
            />
            <Text
              style={[
                c.pillText,
                { color: item.pregnancyStatus ? "#e11d48" : "#9ca3af" },
              ]}
            >
              {item.pregnancyStatus ? "Pregnant" : "Not Confirmed"}
            </Text>
          </View>
          {item.pdDone && (
            <View
              style={[
                c.pill,
                { backgroundColor: "#ecfeff", borderColor: "#a5f3fc" },
              ]}
            >
              <Ionicons name="medical" size={10} color="#0891b2" />
              <Text style={[c.pillText, { color: "#0891b2" }]}>PD Done</Text>
            </View>
          )}
          {!!item.lastCalvingCalfGender && (
            <View
              style={[
                c.pill,
                {
                  backgroundColor:
                    item.lastCalvingCalfGender === "male"
                      ? "#eff6ff"
                      : "#fdf2f8",
                  borderColor:
                    item.lastCalvingCalfGender === "male"
                      ? "#93c5fd"
                      : "#f9a8d4",
                },
              ]}
            >
              <Text style={{ fontSize: 9 }}>
                {item.lastCalvingCalfGender === "male" ? "🐂" : "🐄"}
              </Text>
              <Text
                style={[
                  c.pillText,
                  {
                    color:
                      item.lastCalvingCalfGender === "male"
                        ? "#1d4ed8"
                        : "#be185d",
                  },
                ]}
              >
                {item.lastCalvingCalfGender === "male"
                  ? "Male Calf"
                  : "Female Calf"}
              </Text>
            </View>
          )}
        </View>

        {hasMultipleRecords && (
          <View style={c.historyWrap}>
            <View style={c.historyNav}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setRecordIndex((prev) => Math.max(0, prev - 1))}
                disabled={recordIndex === 0}
                style={[
                  c.historyBtn,
                  recordIndex === 0 && c.historyBtnDisabled,
                ]}
              >
                <Ionicons
                  name="chevron-back"
                  size={14}
                  color={recordIndex === 0 ? "#cbd5e1" : "#7c3aed"}
                />
                <Text
                  style={[
                    c.historyBtnText,
                    recordIndex === 0 && c.historyBtnTextDisabled,
                  ]}
                >
                  Previous
                </Text>
              </TouchableOpacity>
              <View style={c.historyBadge}>
                <Ionicons name="albums-outline" size={12} color="#7c3aed" />
                <Text style={c.historyBadgeText}>
                  {recordIndex + 1}/{group.records.length}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  setRecordIndex((prev) =>
                    Math.min(group.records.length - 1, prev + 1),
                  )
                }
                disabled={recordIndex === group.records.length - 1}
                style={[
                  c.historyBtn,
                  recordIndex === group.records.length - 1 &&
                    c.historyBtnDisabled,
                ]}
              >
                <Text
                  style={[
                    c.historyBtnText,
                    recordIndex === group.records.length - 1 &&
                      c.historyBtnTextDisabled,
                  ]}
                >
                  Next
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={
                    recordIndex === group.records.length - 1
                      ? "#cbd5e1"
                      : "#7c3aed"
                  }
                />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={c.timelineStrip}
            >
              {group.records.map((record, idx) => {
                const active = idx === recordIndex;
                const badgeColor = record.pregnancyStatus
                  ? "#e11d48"
                  : record.aiDate
                    ? "#7c3aed"
                    : "#15803d";
                const badgeLabel = record.pregnancyStatus
                  ? "Pregnant"
                  : record.aiDate
                    ? "AI"
                    : "Natural";
                return (
                  <TouchableOpacity
                    key={record.id}
                    activeOpacity={0.85}
                    onPress={() => setRecordIndex(idx)}
                    style={[c.timelineChip, active && c.timelineChipActive]}
                  >
                    <Text
                      style={[
                        c.timelineChipDate,
                        active && c.timelineChipDateActive,
                      ]}
                    >
                      {record.inseminationDate}
                    </Text>
                    <View
                      style={[
                        c.timelineBadge,
                        {
                          backgroundColor: active
                            ? badgeColor + "18"
                            : "#ffffff",
                          borderColor: active ? badgeColor + "55" : "#e5e7eb",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          c.timelineBadgeText,
                          { color: active ? badgeColor : "#475569" },
                        ]}
                      >
                        {badgeLabel}
                      </Text>
                    </View>
                    <Text
                      style={[
                        c.timelineChipSub,
                        active && c.timelineChipSubActive,
                      ]}
                    >
                      {record.aiDate
                        ? "AI Insemination"
                        : "Natural Insemination"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </TouchableOpacity>

      {expanded && (
        <View>
          <View style={c.divider} />
          <Text style={c.section}>📋 Insemination</Text>
          <DetailRow
            icon={inseminationType === "ai" ? "flask-outline" : "leaf-outline"}
            label="Type"
            value={
              inseminationType === "ai"
                ? "AI Insemination"
                : "Natural Insemination"
            }
            color={inseminationType === "ai" ? "#7c3aed" : "#15803d"}
          />
          <DetailRow
            icon="calendar-outline"
            label="Date"
            value={item.inseminationDate}
            color="#7c3aed"
          />
          {!!item.sire && (
            <DetailRow
              icon="male-outline"
              label="Sire"
              value={item.sire}
              color="#92400e"
            />
          )}
          {!!expectedCalving && (
            <DetailRow
              icon="calendar"
              label="Expected Calving"
              value={expectedCalving}
              color="#16a34a"
            />
          )}

          <Text style={c.section}>❤️ Pregnancy Status</Text>
          <DetailRow
            icon="heart"
            label="Status"
            value={item.pregnancyStatus ? "Pregnant ✓" : "Not Confirmed"}
            color={item.pregnancyStatus ? "#e11d48" : "#9ca3af"}
          />

          <Text style={c.section}>🏥 PD Details</Text>
          <DetailRow
            icon="checkmark-circle-outline"
            label="PD Done"
            value={item.pdDone ? "Yes" : "No"}
            color={item.pdDone ? "#0891b2" : "#9ca3af"}
          />
          {item.pdDone && (
            <>
              <DetailRow
                icon="calendar-outline"
                label="PD Date"
                value={item.pregnancyStatusDate ?? ""}
                color="#0891b2"
              />
              <DetailRow
                icon="person-outline"
                label="Doctor Name"
                value={item.doctorName ?? ""}
                color="#0891b2"
              />
            </>
          )}

          <Text style={c.section}>🐣 Calving</Text>
          <DetailRow
            icon="calendar-outline"
            label="Last Calving"
            value={item.lastCalvingDate || "—"}
            color={item.lastCalvingDate ? "#7c3aed" : "#9ca3af"}
          />
          {!!item.lastCalvingCalfGender && (
            <DetailRow
              icon="male-female-outline"
              label="Last Calf Gender"
              value={genderLabel}
              color={genderColor}
            />
          )}
          <DetailRow
            icon="calendar-outline"
            label="Actual Calving"
            value={item.actualCalvingDate || "—"}
            color={item.actualCalvingDate ? "#16a34a" : "#9ca3af"}
          />
          <DetailRow
            icon="calendar-outline"
            label="Heat After Calving"
            value={item.heatAfterCalvingDate || "—"}
            color={item.heatAfterCalvingDate ? "#d97706" : "#9ca3af"}
          />

          <View style={c.actionRow}>
            <TouchableOpacity
              style={[c.actionBtn, c.editBtn]}
              onPress={() => onEdit(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={15} color="#ea580c" />
              <Text style={[c.actionText, { color: "#ea580c" }]}>Update</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[c.actionBtn, c.deleteBtn]}
              onPress={() => onDelete(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={15} color="#dc2626" />
              <Text style={[c.actionText, { color: "#dc2626" }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

// ─── Main Screen
export default function InseminationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [records, setRecords] = useState<InseminationRecord[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [dateRange, setDateRange] = useState<DateRangeOption>("all_time");
  const [sortVisible, setSortVisible] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InseminationRecord | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cowMap, setCowMap] = useState<
    Record<string, { type: string; photo?: string }>
  >({});
  const fetchRecords = useCallback(async (searchTerm?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInseminations(searchTerm);
      setRecords(data);
    } catch (err: any) {
      setError(err.message ?? "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    const t = setTimeout(() => fetchRecords(search || undefined), 400);
    return () => clearTimeout(t);
  }, [search]);

  //for fetch cow image
  useEffect(() => {
    api
      .getCows()
      .then((data: Cow[]) => {
        const map: Record<string, { type: string; photo?: string }> = {};
        data.forEach((c) => {
          map[c.tag] = { type: c.type, photo: c.photo };
        });
        setCowMap(map);
      })
      .catch(() => {});
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRecords(search || undefined);
    setRefreshing(false);
  };

  const handleDelete = (r: InseminationRecord) => {
    Alert.alert(
      "Delete Record",
      `Delete insemination record for ${r.cowName} (${r.cowSrNo})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.deleteInsemination(r.id);
              setRecords((prev) => prev.filter((x) => x.id !== r.id));
            } catch (err: any) {
              Alert.alert("Error", err.message ?? "Failed to delete.");
            }
          },
        },
      ],
    );
  };

  const stats = {
    total: records.length,
    pregnant: records.filter((r) => r.pregnancyStatus).length,
    pdDone: records.filter((r) => r.pdDone).length,
    calved: records.filter((r) => !!r.actualCalvingDate).length,
  };

  const isWithinRange = (createdAt: string, range: DateRangeOption) => {
    if (range === "all_time") return true;
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return true;
    const diffDays = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    if (range === "last_week") return diffDays <= 7;
    if (range === "last_month") return diffDays <= 30;
    return diffDays <= 365;
  };

  const groupedRecords = records.reduce<InseminationGroup[]>(
    (groups, record) => {
      const existing = groups.find((g) => g.cowSrNo === record.cowSrNo);
      if (existing) {
        existing.records.push(record);
        existing.records.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      } else {
        groups.push({
          cowSrNo: record.cowSrNo,
          cowName: record.cowName,
          records: [record],
        });
      }
      return groups;
    },
    [],
  );

  const visibleGroupedRecords = groupedRecords
    .filter((g) => isWithinRange(g.records[0]?.created_at ?? "", dateRange))
    .sort((a, b) => {
      if (sortBy === "name_asc") return a.cowName.localeCompare(b.cowName);
      if (sortBy === "name_desc") return b.cowName.localeCompare(a.cowName);
      const aTime = new Date(a.records[0]?.created_at ?? 0).getTime();
      const bTime = new Date(b.records[0]?.created_at ?? 0).getTime();
      if (sortBy === "oldest") return aTime - bTime;
      return bTime - aTime;
    });

  const sortMeta: Record<
    SortOption,
    { label: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    newest: { label: "Newest", icon: "time-outline" },
    oldest: { label: "Oldest", icon: "hourglass-outline" },
    name_asc: { label: "Name A-Z", icon: "text-outline" },
    name_desc: { label: "Name Z-A", icon: "text-outline" },
  };

  const dateRangeMeta: Record<
    DateRangeOption,
    { label: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    all_time: { label: "All Time", icon: "calendar-outline" },
    last_week: { label: "Last Week", icon: "today-outline" },
    last_month: { label: "Last Month", icon: "calendar-clear-outline" },
    last_year: { label: "Last Year", icon: "calendar-number-outline" },
  };

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8F0" />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={s.headerTitle}>Insemination</Text>
          <Text style={s.headerSub}>
            {visibleGroupedRecords.length} cows · {records.length} records
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setSortVisible(true)}
          style={s.sortBtn}
        >
          <Ionicons name={sortMeta[sortBy].icon} size={16} color="#7c3aed" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setAddModal(true)}
          style={s.headerAddBtn}
        >
          <Ionicons name="add" size={20} color="#7c3aed" />
        </TouchableOpacity>
      </View>

      {/* ── Sort Modal ── */}
      <Modal
        visible={sortVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSortVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={s.sortOverlay}
          onPress={() => setSortVisible(false)}
        >
          <View style={s.sortSheet}>
            <Text style={s.sortSheetTitle}>Sort Records</Text>
            <Text style={s.sortSheetSub}>Choose date filter and ordering</Text>
            <Text style={s.sortSectionTitle}>Date Filter</Text>
            {(
              ["all_time", "last_week", "last_month", "last_year"] as const
            ).map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  s.sortOption,
                  dateRange === option && s.sortOptionActive,
                ]}
                onPress={() => setDateRange(option)}
              >
                <Ionicons
                  name={dateRangeMeta[option].icon}
                  size={15}
                  color={dateRange === option ? "#7c3aed" : "#9ca3af"}
                />
                <Text
                  style={[
                    s.sortOptionText,
                    dateRange === option && s.sortOptionTextActive,
                  ]}
                >
                  {dateRangeMeta[option].label}
                </Text>
              </TouchableOpacity>
            ))}
            <Text style={s.sortSectionTitle}>Order By</Text>
            {(["newest", "oldest", "name_asc", "name_desc"] as const).map(
              (option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    s.sortOption,
                    sortBy === option && s.sortOptionActive,
                  ]}
                  onPress={() => {
                    setSortBy(option);
                    setSortVisible(false);
                  }}
                >
                  <Ionicons
                    name={sortMeta[option].icon}
                    size={15}
                    color={sortBy === option ? "#7c3aed" : "#9ca3af"}
                  />
                  <Text
                    style={[
                      s.sortOptionText,
                      sortBy === option && s.sortOptionTextActive,
                    ]}
                  >
                    {sortMeta[option].label}
                  </Text>
                </TouchableOpacity>
              ),
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Stats Bar ── */}
      <View style={s.statsRow}>
        {[
          { label: "Total", value: stats.total, color: "#7c3aed" },
          { label: "Pregnant", value: stats.pregnant, color: "#e11d48" },
          { label: "PD Done", value: stats.pdDone, color: "#0891b2" },
          { label: "Calved", value: stats.calved, color: "#16a34a" },
        ].map((st, i, arr) => (
          <View
            key={i}
            style={[s.statItem, i < arr.length - 1 && s.statBorder]}
          >
            <Text style={[s.statValue, { color: st.color }]}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Search ── */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={15} color="#9ca3af" />
        <TextInput
          style={s.searchInput}
          placeholder="Search cow name or Sr. No..."
          placeholderTextColor="#d1d5db"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={15} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── List ── */}
      {loading && records.length === 0 ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={s.loadingText}>Loading records...</Text>
        </View>
      ) : error ? (
        <View style={s.errorWrap}>
          <Text style={{ fontSize: 40 }}>⚠️</Text>
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchRecords()} style={s.retryBtn}>
            <Ionicons name="refresh" size={14} color="#fff" />
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visibleGroupedRecords}
          keyExtractor={(item) => item.cowSrNo}
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingTop: 10,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#7c3aed"
            />
          }
          renderItem={({ item, index }) => (
            <InseminationCard
              group={item}
              index={index}
              cowType={cowMap[item.cowSrNo]?.type}
              cowPhoto={cowMap[item.cowSrNo]?.photo}
              onEdit={(r) => {
                setEditingRecord(r);
                setEditModal(true);
              }}
              onDelete={handleDelete}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconWrap}>
                <Text style={{ fontSize: 48 }}>🧬</Text>
              </View>
              <Text style={s.emptyTitle}>No Records Yet</Text>
              <Text style={s.emptySubtitle}>
                Tap the + button below to add your first insemination record
              </Text>
              <TouchableOpacity
                onPress={() => setAddModal(true)}
                style={s.emptyAddBtn}
              >
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={s.emptyAddBtnText}>Add First Record</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* ── FAB ── */}
      <TouchableOpacity
        onPress={() => setAddModal(true)}
        style={s.fab}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <AddModal
        visible={addModal}
        onClose={() => setAddModal(false)}
        onAdd={(r) => setRecords((p) => [r, ...p])}
      />
      <EditModal
        visible={editModal}
        record={editingRecord}
        onClose={() => {
          setEditModal(false);
          setEditingRecord(null);
        }}
        onSave={(updated) =>
          setRecords((prev) =>
            prev.map((r) => (r.id === updated.id ? updated : r)),
          )
        }
      />
    </View>
  );
}

// ─── Styles
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8F0" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFF8F0",
    borderBottomWidth: 1,
    borderBottomColor: "#fdc5bb",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF8F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fdc5bb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
    marginTop: 1,
  },
  headerAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#faf5ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  sortBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#faf5ff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e9d5ff",
    marginRight: 8,
  },
  sortOverlay: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.28)",
    justifyContent: "flex-start",
    paddingTop: 96,
    paddingHorizontal: 16,
  },
  sortSheet: {
    alignSelf: "flex-end",
    width: 220,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e9d5ff",
    padding: 12,
  },
  sortSheetTitle: { fontSize: 15, fontWeight: "800", color: "#111827" },
  sortSheetSub: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
    marginTop: 2,
    marginBottom: 8,
  },
  sortSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#9ca3af",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sortOptionActive: { backgroundColor: "#faf5ff" },
  sortOptionText: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  sortOptionTextActive: { color: "#7c3aed" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#ffe5dd",
    borderBottomWidth: 1,
    borderBottomColor: "#fdc5bb",
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  statBorder: { borderRightWidth: 1, borderRightColor: "#fdc5bb" },
  statValue: { fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  statLabel: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 2,
    fontWeight: "500",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    margin: 14,
    marginBottom: 6,
    backgroundColor: "#faf3ef",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f5c99f",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, color: "#111827", fontSize: 14 },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  empty: {
    alignItems: "center",
    paddingTop: 70,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "#faf5ff",
    borderWidth: 2,
    borderColor: "#e9d5ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 20,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
    marginTop: 8,
  },
  emptyAddBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#9ca3af", fontWeight: "500" },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#7c3aed",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});

const c = StyleSheet.create({
  card: {
    backgroundColor: "#f8d0be",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#fdc5bb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: -0.2,
  },
  sr: { fontSize: 12, color: "#9ca3af", fontWeight: "500", marginTop: 1 },
  historyHint: {
    fontSize: 11,
    color: "#7c3aed",
    fontWeight: "700",
    marginTop: 3,
  },
  sireLabel: {
    fontSize: 11,
    color: "#92400e",
    fontWeight: "600",
    marginTop: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: "700" },
  pills: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#faf5ff",
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  typePillAi: { backgroundColor: "#faf5ff", borderColor: "#d8b4fe" },
  typePillNatural: { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  pillText: { fontSize: 11, color: "#7c3aed", fontWeight: "600" },
  historyNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  historyWrap: { marginTop: 10, gap: 10 },
  historyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#faf5ff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9d5ff",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  historyBtnDisabled: { backgroundColor: "#f8fafc", borderColor: "#e5e7eb" },
  historyBtnText: { fontSize: 12, color: "#7c3aed", fontWeight: "700" },
  historyBtnTextDisabled: { color: "#cbd5e1" },
  historyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e9d5ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  historyBadgeText: { fontSize: 11, color: "#7c3aed", fontWeight: "700" },
  timelineStrip: { gap: 8, paddingRight: 2 },
  timelineChip: {
    minWidth: 92,
    borderRadius: 14,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fdc5bb",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  timelineChipActive: { backgroundColor: "#faf5ff", borderColor: "#d8b4fe" },
  timelineChipDate: { fontSize: 12, color: "#9a3412", fontWeight: "700" },
  timelineChipDateActive: { color: "#7c3aed" },
  timelineChipSub: {
    fontSize: 10,
    color: "#c2410c",
    fontWeight: "600",
    marginTop: 2,
  },
  timelineChipSubActive: { color: "#7c3aed" },
  timelineBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: "100%",
  },
  timelineBadgeText: { fontSize: 10, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 12 },
  section: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    marginTop: 4,
  },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  editBtn: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  deleteBtn: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  actionText: { fontSize: 13, fontWeight: "700" },
});

const d = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    gap: 8,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { flex: 1, fontSize: 13, color: "#6b7280", fontWeight: "500" },
  value: { fontSize: 13, fontWeight: "700", color: "#111827" },
});

const f = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  focused: { borderColor: "#7c3aed", backgroundColor: "#fff" },
  input: { flex: 1, color: "#111827", fontSize: 14, fontWeight: "500" },
  typeSwitch: { gap: 10 },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "#f9fafb",
  },
  typeOptionInactive: { borderColor: "#e5e7eb" },
  typeOptionAiActive: { borderColor: "#d8b4fe", backgroundColor: "#faf5ff" },
  typeOptionNaturalActive: {
    borderColor: "#86efac",
    backgroundColor: "#f0fdf4",
  },
  typeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  typeIconWrapAi: { backgroundColor: "#f3e8ff", borderColor: "#d8b4fe" },
  typeIconWrapNatural: { backgroundColor: "#dcfce7", borderColor: "#86efac" },
  typeTitle: { fontSize: 14, fontWeight: "700", color: "#111827" },
  typeSub: { fontSize: 11, color: "#9ca3af", marginTop: 2, fontWeight: "500" },
  calvingDateActive: { backgroundColor: "#f0fdf4", borderColor: "#86efac" },
  calvingDateText: { color: "#15803d", fontWeight: "700" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 0.2 },
  toggleCard: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  toggleSub: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  readOnlyWrap: { marginBottom: 12 },
  readOnlyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#faf5ff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e9d5ff",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  readOnlyText: { flex: 1, color: "#7c3aed", fontSize: 14, fontWeight: "600" },
  autoBadge: {
    backgroundColor: "#7c3aed",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  autoBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.4,
  },
  expectedWrap: { marginBottom: 12 },
  expectedRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#86efac",
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  expectedText: { flex: 1, color: "#16a34a", fontSize: 14, fontWeight: "700" },
  expectedBadge: {
    backgroundColor: "#16a34a",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  expectedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.4,
  },
  expectedHint: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
    paddingLeft: 2,
  },
});

const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#f8efeb",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#faf5ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  editSubName: {
    fontSize: 12,
    color: "#9ca3af",
    fontWeight: "500",
    marginTop: 1,
  },
  sub: { fontSize: 13, color: "#9ca3af", fontWeight: "500", marginBottom: 16 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  subFields: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0f2fe",
    marginBottom: 4,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
    marginTop: 14,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.2,
  },
});

const cs = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  triggerText: { flex: 1, color: "#d1d5db", fontSize: 14 },
  selected: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#faf5ff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#c4b5fd",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectedLeft: { flex: 1 },
  selectedTag: { fontSize: 13, fontWeight: "800", color: "#7c3aed" },
  selectedName: {
    fontSize: 12,
    color: "#a78bfa",
    fontWeight: "500",
    marginTop: 1,
  },
  clearBtn: { padding: 4 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-start",
    paddingTop:
      Platform.OS === "ios" ? 60 : (StatusBar.currentHeight ?? 0) + 16,
    paddingBottom: 16,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginHorizontal: 16,
    minHeight: 300,
    maxHeight: "80%",
    overflow: "hidden",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  searchInput: { flex: 1, color: "#111827", fontSize: 14 },
  countHint: {
    fontSize: 11,
    color: "#9ca3af",
    fontWeight: "500",
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  list: { flexGrow: 0 },
  cowRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 12,
  },
  cowEmoji: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cowTag: { fontSize: 13, fontWeight: "700", color: "#111827" },
  cowName: { fontSize: 12, color: "#9ca3af", fontWeight: "500", marginTop: 1 },
  loadingWrap: { paddingVertical: 40, alignItems: "center", gap: 10 },
  loadingText: { fontSize: 13, color: "#9ca3af" },
  emptyWrap: { paddingVertical: 40, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, color: "#9ca3af", fontWeight: "600" },
  footerLoader: { paddingVertical: 14, alignItems: "center", gap: 4 },
  footerLoaderText: { fontSize: 11, color: "#9ca3af" },
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  loadMoreText: { fontSize: 13, fontWeight: "700", color: "#7c3aed" },
  endText: {
    fontSize: 11,
    color: "#d1d5db",
    textAlign: "center",
    paddingVertical: 12,
  },
});

const gb = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    padding: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  headerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#374151",
    letterSpacing: 0.4,
    flex: 1,
    textTransform: "uppercase",
  },
  selectedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectedBadgeText: { fontSize: 10, fontWeight: "700" },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 2,
    gap: 6,
    position: "relative",
  },
  maleInactive: { backgroundColor: "#f9fafb", borderColor: "#e5e7eb" },
  maleActive: { backgroundColor: "#eff6ff", borderColor: "#3b82f6" },
  femaleInactive: { backgroundColor: "#f9fafb", borderColor: "#e5e7eb" },
  femaleActive: { backgroundColor: "#fdf2f8", borderColor: "#ec4899" },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 2,
  },
  btnLabel: { fontSize: 14, fontWeight: "800", letterSpacing: -0.2 },
  btnSub: { fontSize: 11, fontWeight: "500" },
  checkmark: { position: "absolute", top: 8, right: 8 },
  hintText: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 10,
    fontWeight: "500",
  },
});
