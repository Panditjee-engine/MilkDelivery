import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Animated,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Share,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useIsFocused } from "@react-navigation/native";
import { api } from "../../../src/services/api";
import * as Sharing from "expo-sharing";
import { printToFileAsync } from "expo-print";

// ── expo-file-system version-agnostic helper
async function moveFileSafe(from: string, to: string): Promise<void> {
  try {
    const FS = require("expo-file-system");
    if (typeof FS.moveAsync === "function") {
      await FS.moveAsync({ from, to });
    }
  } catch (_) {}
}

function getCacheDir(): string {
  try {
    const FS = require("expo-file-system");
    return (
      FS["cacheDirectory"] ??
      FS["documentDirectory"] ??
      FS["Dirs"]?.["Cache"] ??
      FS["Dirs"]?.["Document"] ??
      ""
    );
  } catch (_) {
    return "";
  }
}

const { width: SW } = Dimensions.get("window");

// ── Original Warm Palette
const C = {
  primary: "#FF9675",
  accent: "#FD9E69",
  light: "#FFD999",
  dark: "#BB6B3F",
  bg: "#FFF8EF",
  card: "#FFFFFF",
  text: "#3D1F0A",
  textMuted: "#A07850",
  textLight: "#C9A882",
  border: "#F5E6D0",
};

// ── Types
interface Note {
  id: string;
  admin_id: string;
  title: string;
  content: string;
  color: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

interface AlertAction {
  label: string;
  onPress: () => void;
  style?: "default" | "danger" | "cancel";
}

// ── Helpers
const stripHtml = (html: string) =>
  html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

function parseContent(raw: string): {
  text: string;
  checklist: ChecklistItem[];
} {
  try {
    if (raw.startsWith("CHECKLIST::")) {
      const parts = raw.split("::TEXT::");
      const checklist = JSON.parse(
        parts[0].replace("CHECKLIST::", ""),
      ) as ChecklistItem[];
      return { text: parts[1] ?? "", checklist };
    }
  } catch (_) {}
  return { text: stripHtml(raw), checklist: [] };
}

function serializeContent(text: string, checklist: ChecklistItem[]): string {
  if (checklist.length === 0) return text;
  return `CHECKLIST::${JSON.stringify(checklist)}::TEXT::${text}`;
}

// ── PDF Export
async function exportNotePDF(note: Note) {
  const { text, checklist } = parseContent(note.content);

  const checklistHtml =
    checklist.length > 0
      ? `<div style="margin-top:20px;">
          <h3 style="color:#BB6B3F;font-size:14px;margin-bottom:10px;">Checklist</h3>
          ${checklist
            .map(
              (it) => `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
              <div style="width:16px;height:16px;border-radius:4px;border:2px solid #FF9675;
                background:${it.done ? "#FF9675" : "transparent"};flex-shrink:0;"></div>
              <span style="font-size:13px;color:${it.done ? "#A07850" : "#3D1F0A"};
                text-decoration:${it.done ? "line-through" : "none"};">${it.text}</span>
            </div>`,
            )
            .join("")}
        </div>`
      : "";

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      body{font-family:Georgia,serif;padding:40px;color:#3D1F0A;background:#FFF8EF;}
      .header{border-bottom:2px solid #FFD999;padding-bottom:16px;margin-bottom:24px;}
      .logo{font-size:11px;color:#A07850;font-weight:600;letter-spacing:1px;text-transform:uppercase;}
      h1{font-size:26px;color:#BB6B3F;margin:8px 0 4px;}
      .meta{font-size:11px;color:#C9A882;}
      .content{font-size:15px;line-height:1.8;white-space:pre-wrap;}
      .footer{margin-top:40px;font-size:10px;color:#C9A882;text-align:center;border-top:1px solid #FFD999;padding-top:12px;}
    </style></head><body>
    <div class="header">
      <div class="logo">GauSevak · Notes</div>
      <h1>${note.title}</h1>
      <div class="meta">Created ${fmtDate(note.created_at)} · Updated ${fmtDate(note.updated_at)}</div>
    </div>
    <div class="content">${text}</div>
    ${checklistHtml}
    <div class="footer">Exported from GauSevak App · ${new Date().toLocaleDateString("en-IN")}</div>
    </body></html>`;

  try {
    const { uri: tempUri } = await printToFileAsync({ html, base64: false });
    const dir = tempUri.substring(0, tempUri.lastIndexOf("/") + 1);
    const destUri = `${dir}Note_${note.title.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`;
    await moveFileSafe(tempUri, destUri);
    const finalUri = destUri !== tempUri ? destUri : tempUri;
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(finalUri, {
        mimeType: "application/pdf",
        dialogTitle: `Export: ${note.title}`,
        UTI: "com.adobe.pdf",
      });
    } else {
      await Share.share({ title: note.title, url: finalUri });
    }
  } catch (_err) {
    await Share.share({
      title: note.title,
      message: `${note.title}\n\n${text}`,
    });
  }
}

// ── Custom Alert
function CustomAlert({
  visible,
  title,
  message,
  actions,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  actions: AlertAction[];
  onClose: () => void;
}) {
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: visible ? 1 : 0.88,
        tension: 90,
        friction: 11,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  if (!visible) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[al.overlay, { opacity }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View style={[al.box, { transform: [{ scale }], opacity }]}>
          <View style={al.accentBar} />
          <View style={al.iconWrap}>
            <View style={al.iconRing}>
              <LinearGradient
                colors={[C.primary, C.dark]}
                style={al.iconCircle}
              >
                <Ionicons name="alert-circle-outline" size={26} color="#fff" />
              </LinearGradient>
            </View>
          </View>
          <Text style={al.title}>{title}</Text>
          {message ? <Text style={al.message}>{message}</Text> : null}
          <View style={al.divider} />
          <View style={al.actions}>
            {actions.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  al.btn,
                  a.style === "danger" && al.btnDanger,
                  a.style === "cancel" && al.btnCancel,
                  a.style === "default" && al.btnDefault,
                ]}
                onPress={() => {
                  a.onPress();
                  onClose();
                }}
                activeOpacity={0.82}
              >
                {a.style === "danger" && (
                  <Ionicons
                    name="trash-outline"
                    size={14}
                    color="#dc2626"
                    style={{ marginRight: 6 }}
                  />
                )}
                {a.style === "default" && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color="#fff"
                    style={{ marginRight: 6 }}
                  />
                )}
                <Text
                  style={[
                    al.btnText,
                    a.style === "danger" && al.btnTextDanger,
                    a.style === "cancel" && al.btnTextCancel,
                    a.style === "default" && { color: "#fff" },
                  ]}
                >
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Checklist Editor
function ChecklistEditor({
  items,
  onChange,
}: {
  items: ChecklistItem[];
  onChange: (i: ChecklistItem[]) => void;
}) {
  const [newText, setNewText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const addItem = () => {
    if (!newText.trim()) return;
    onChange([
      ...items,
      { id: Date.now().toString(), text: newText.trim(), done: false },
    ]);
    setNewText("");
    inputRef.current?.focus();
  };

  const toggle = (id: string) =>
    onChange(
      items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
    );

  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  const doneCount = items.filter((i) => i.done).length;

  return (
    <View style={cl.wrap}>
      <View style={cl.header}>
        <Ionicons name="checkbox-outline" size={14} color={C.textMuted} />
        <Text style={cl.heading}>Checklist</Text>
        <Text style={cl.count}>{doneCount}/{items.length}</Text>
      </View>

      {items.map((item) => (
        <View key={item.id} style={cl.row}>
          <TouchableOpacity
            onPress={() => toggle(item.id)}
            style={[cl.checkbox, item.done && cl.checkboxDone]}
            activeOpacity={0.8}
          >
            {item.done && <Ionicons name="checkmark" size={12} color="#fff" />}
          </TouchableOpacity>
          <Text style={[cl.itemText, item.done && cl.itemDone]} numberOfLines={2}>
            {item.text}
          </Text>
          <TouchableOpacity
            onPress={() => remove(item.id)}
            style={cl.removeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={14} color={C.textLight} />
          </TouchableOpacity>
        </View>
      ))}

      {items.length > 0 && (
        <View style={cl.progressBar}>
          <View
            style={[
              cl.progressFill,
              { width: `${(doneCount / items.length) * 100}%` as any },
            ]}
          />
        </View>
      )}

      <View style={cl.addRow}>
        <TextInput
          ref={inputRef}
          value={newText}
          onChangeText={setNewText}
          placeholder="Add checklist item…"
          placeholderTextColor={C.textLight}
          style={cl.addInput}
          onSubmitEditing={addItem}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        <TouchableOpacity
          onPress={addItem}
          style={[cl.addBtn, !newText.trim() && { opacity: 0.4 }]}
          disabled={!newText.trim()}
        >
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Note Card
function NoteCard({
  item,
  index,
  onPress,
  onPin,
  onDelete,
  onExport,
}: {
  item: Note;
  index: number;
  onPress: (n: Note) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (n: Note) => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(20)).current;
  const { text, checklist } = parseContent(item.content);
  const doneCount = checklist.filter((c) => c.done).length;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: index * 45,
        useNativeDriver: true,
      }),
      Animated.spring(ty, {
        toValue: 0,
        delay: index * 45,
        tension: 75,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{ opacity: anim, transform: [{ translateY: ty }], flex: 1 }}
    >
      <TouchableOpacity
        onPress={() => onPress(item)}
        activeOpacity={0.91}
        style={[nc.card, { backgroundColor: item.color || "#fff" }]}
      >
        {item.is_pinned && (
          <View style={nc.pinStrip}>
            <Ionicons name="star" size={9} color="#fff" />
            <Text style={nc.pinText}>Pinned</Text>
          </View>
        )}
        <Text style={nc.title} numberOfLines={2}>
          {item.title || "Untitled"}
        </Text>
        {text.length > 0 && (
          <Text style={nc.preview} numberOfLines={3}>{text}</Text>
        )}
        {checklist.length > 0 && (
          <View style={nc.checkPreview}>
            <View style={nc.checkBar}>
              <View
                style={[
                  nc.checkFill,
                  { width: `${(doneCount / checklist.length) * 100}%` as any },
                ]}
              />
            </View>
            <Text style={nc.checkCount}>{doneCount}/{checklist.length} done</Text>
          </View>
        )}
        <View style={nc.footer}>
          <View>
            <Text style={nc.date}>{fmtDate(item.updated_at)}</Text>
            <Text style={nc.time}>{fmtTime(item.updated_at)}</Text>
          </View>
          <View style={nc.footerActions}>
            <TouchableOpacity
              style={[nc.iconBtn, item.is_pinned && { backgroundColor: C.light }]}
              onPress={() => onPin(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={item.is_pinned ? "star" : "star-outline"}
                size={13}
                color={item.is_pinned ? C.dark : C.textLight}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={nc.iconBtn}
              onPress={() => onExport(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="share-outline" size={13} color={C.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[nc.iconBtn, { backgroundColor: "#fef2f2" }]}
              onPress={() => onDelete(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={13} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Note Editor Screen
function NoteEditorScreen({
  note,
  onBack,
  onSaved,
  onExport,
}: {
  note: Note | null;
  onBack: () => void;
  onSaved: (saved: Note) => void;
  onExport: (n: Note) => void;
}) {
  const insets = useSafeAreaInsets();
  const contentInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const [title, setTitle] = useState(note?.title ?? "");
  const [text, setText] = useState(() =>
    note ? parseContent(note.content).text : "",
  );
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() =>
    note ? parseContent(note.content).checklist : [],
  );
  const [color] = useState(note?.color ?? "#FFFFFF");
  const [tab, setTab] = useState<"write" | "checklist">("write");
  const [saving, setSaving] = useState(false);
  const [charCount, setCharCount] = useState(() =>
    note ? parseContent(note.content).text.length : 0,
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    });
    return () => show.remove();
  }, []);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const content = serializeContent(text, checklist);
      const saved: Note = note
        ? await api.updateNote(note.id, { title: title.trim(), content, color })
        : await api.createNote({ title: title.trim(), content, color });
      onSaved(saved);
    } catch (_) {
      setSaving(false);
    }
  };

  const handleTextChange = (val: string) => {
    setText(val);
    setCharCount(val.length);
  };

  const bgColor = color || "#FFFFFF";

  return (
    <Animated.View
      style={[ed.screen, { backgroundColor: bgColor, opacity: fadeAnim }]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={bgColor} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Top safe-area */}
        <View style={{ paddingTop: insets.top, backgroundColor: bgColor }}>
          {/* Header */}
          <View style={[ed.header, { borderBottomColor: C.border }]}>
            <TouchableOpacity
              onPress={onBack}
              style={ed.headerBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={18} color={C.text} />
            </TouchableOpacity>
            <Text style={ed.headerTitle} numberOfLines={1}>
              {note ? "Edit Note" : "New Note"}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {note && (
                <TouchableOpacity
                  onPress={() => onExport(note)}
                  style={ed.headerBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-outline" size={18} color={C.dark} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleSave}
                disabled={!title.trim() || saving}
                style={[
                  ed.saveBtn,
                  (!title.trim() || saving) && { opacity: 0.45 },
                ]}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                    <Text style={ed.saveBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Tabs */}
          <View style={ed.tabs}>
            {(["write", "checklist"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={[ed.tab, tab === t && ed.tabActive]}
              >
                <Ionicons
                  name={t === "write" ? "pencil-outline" : "checkbox-outline"}
                  size={12}
                  color={tab === t ? C.dark : C.textLight}
                />
                <Text style={[ed.tabText, tab === t && ed.tabTextActive]}>
                  {t === "write" ? "Write" : "Checklist"}
                </Text>
              </TouchableOpacity>
            ))}
            {tab === "write" && (
              <Text style={ed.charCount}>{charCount} chars</Text>
            )}
          </View>
        </View>

        {/* Single ScrollView wrapping all body content */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, backgroundColor: bgColor }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bounces
        >
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Note title…"
            placeholderTextColor={C.textLight}
            style={ed.titleInput}
            returnKeyType="next"
            maxLength={120}
            onSubmitEditing={() => contentInputRef.current?.focus()}
          />

          {tab === "write" ? (
            <TextInput
              ref={contentInputRef}
              value={text}
              onChangeText={handleTextChange}
              placeholder="Start writing your note…"
              placeholderTextColor={C.textLight}
              style={ed.contentInput}
              multiline
              textAlignVertical="top"
              scrollEnabled={false}
              onFocus={() =>
                setTimeout(
                  () => scrollRef.current?.scrollToEnd({ animated: true }),
                  300,
                )
              }
            />
          ) : (
            <ChecklistEditor items={checklist} onChange={setChecklist} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {note && (
        <View style={[ed.updatedBadge, { bottom: insets.bottom + 8 }]}>
          <Ionicons name="time-outline" size={10} color={C.textLight} />
          <Text style={ed.updatedText}>Updated {fmtDate(note.updated_at)}</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ── MAIN EXPORT
export default function NotesScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned">("all");
  const [exporting, setExporting] = useState(false);

  const [screen, setScreen] = useState<"list" | "editor">("list");
  const [editNote, setEditNote] = useState<Note | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    actions: AlertAction[];
  }>({ visible: false, title: "", actions: [] });

  const showAlert = (title: string, message: string, actions: AlertAction[]) =>
    setAlertConfig({ visible: true, title, message, actions });
  const hideAlert = () => setAlertConfig((p) => ({ ...p, visible: false }));

  const fetchNotes = useCallback(async (q?: string) => {
    try {
      const data = await api.getNotes(q);
      setNotes(data);
    } catch (e: any) {
      showAlert("Error", e.message || "Failed to load notes", [
        { label: "OK", onPress: () => {}, style: "default" },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isFocused && screen === "list") fetchNotes();
  }, [isFocused, screen]);

  useEffect(() => {
    const t = setTimeout(() => fetchNotes(search || undefined), 350);
    return () => clearTimeout(t);
  }, [search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotes(search || undefined);
  };

  const openEditor = (note: Note | null) => {
    setEditNote(note);
    setScreen("editor");
  };

  const handleEditorSaved = (saved: Note) => {
    setNotes((prev) => {
      const exists = prev.find((n) => n.id === saved.id);
      return exists
        ? prev.map((n) => (n.id === saved.id ? saved : n))
        : [saved, ...prev];
    });
    setScreen("list");
  };

  const handleDelete = (id: string) => {
    const note = notes.find((n) => n.id === id);
    showAlert(
      "Delete Note",
      `"${note?.title || "this note"}" will be permanently deleted.`,
      [
        { label: "Cancel", onPress: () => {}, style: "cancel" },
        {
          label: "Delete",
          style: "danger",
          onPress: async () => {
            try {
              await api.deleteNote(id);
              setNotes((prev) => prev.filter((n) => n.id !== id));
            } catch (e: any) {
              showAlert("Error", e.message, [
                { label: "OK", onPress: () => {}, style: "default" },
              ]);
            }
          },
        },
      ],
    );
  };

  const handlePin = async (id: string) => {
    try {
      const res = await api.toggleNotePin(id);
      setNotes((prev) =>
        prev.map((n) =>
          n.id === res.id ? { ...n, is_pinned: res.is_pinned } : n,
        ),
      );
    } catch (_) {}
  };

  const handleExport = async (note: Note) => {
    setExporting(true);
    try {
      await exportNotePDF(note);
    } catch (e: any) {
      showAlert("Export Failed", e.message || "Could not export", [
        { label: "OK", onPress: () => {}, style: "default" },
      ]);
    } finally {
      setExporting(false);
    }
  };

  if (screen === "editor") {
    return (
      <NoteEditorScreen
        note={editNote}
        onBack={() => setScreen("list")}
        onSaved={handleEditorSaved}
        onExport={handleExport}
      />
    );
  }

  const filtered = notes.filter((n) => filter !== "pinned" || n.is_pinned);
  const ordered = [
    ...filtered.filter((n) => n.is_pinned),
    ...filtered.filter((n) => !n.is_pinned),
  ];

  return (
    <View style={[ls.screen, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <LinearGradient colors={["#ffffff", "#FFF8EF"]} style={ls.header}>
        <TouchableOpacity onPress={() => router.back()} style={ls.backBtn}>
          <Ionicons name="arrow-back" size={19} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={ls.headerTitle}>My Notes</Text>
          <Text style={ls.headerSub}>
            {notes.length} note{notes.length !== 1 ? "s" : ""} ·{" "}
            {notes.filter((n) => n.is_pinned).length} pinned
          </Text>
        </View>
        <TouchableOpacity
          style={ls.addBtn}
          onPress={() => openEditor(null)}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[C.primary, C.dark]} style={ls.addBtnGrad}>
            <Ionicons name="add" size={22} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      <View style={ls.statsBar}>
        {[
          { label: "Total", val: notes.length, color: C.textMuted },
          {
            label: "Pinned",
            val: notes.filter((n) => n.is_pinned).length,
            color: C.dark,
          },
          {
            label: "Today",
            val: notes.filter((n) =>
              n.created_at.startsWith(new Date().toISOString().slice(0, 10)),
            ).length,
            color: C.accent,
          },
        ].map((st, i, arr) => (
          <View
            key={i}
            style={[ls.statItem, i < arr.length - 1 && ls.statDiv]}
          >
            <Text style={[ls.statVal, { color: st.color }]}>{st.val}</Text>
            <Text style={ls.statLbl}>{st.label}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={ls.loader}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={ls.loaderText}>Loading notes…</Text>
        </View>
      ) : (
        <>
          <View style={ls.searchRow}>
            <View style={ls.searchBox}>
              <Ionicons name="search-outline" size={15} color={C.textLight} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search title or content…"
                placeholderTextColor={C.textLight}
                style={ls.searchInput}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons
                    name="close-circle"
                    size={15}
                    color={C.textLight}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={ls.chips}>
            {[
              {
                key: "all" as const,
                label: "All",
                icon: "document-text-outline",
                count: notes.length,
              },
              {
                key: "pinned" as const,
                label: "Pinned",
                icon: "star-outline",
                count: notes.filter((n) => n.is_pinned).length,
              },
            ].map((fl) => {
              const active = filter === fl.key;
              return (
                <TouchableOpacity
                  key={fl.key}
                  onPress={() => setFilter(fl.key)}
                  style={[ls.chip, active && ls.chipActive]}
                >
                  <Ionicons
                    name={fl.icon as any}
                    size={11}
                    color={active ? "#fff" : C.textMuted}
                  />
                  <Text style={[ls.chipText, active && ls.chipTextActive]}>
                    {fl.label}
                  </Text>
                  <View style={[ls.chipBadge, active && ls.chipBadgeActive]}>
                    <Text
                      style={[ls.chipBadgeText, active && { color: "#fff" }]}
                    >
                      {fl.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <FlatList
            data={ordered}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={{
              paddingHorizontal: 14,
              paddingTop: 8,
              paddingBottom: insets.bottom + 60,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={C.primary}
              />
            }
            renderItem={({ item, index }) => (
              <NoteCard
                item={item}
                index={index}
                onPress={openEditor}
                onPin={handlePin}
                onDelete={handleDelete}
                onExport={handleExport}
              />
            )}
            ListEmptyComponent={
              <View style={ls.empty}>
                <LinearGradient
                  colors={[C.primary, C.dark]}
                  style={ls.emptyIcon}
                >
                  <Ionicons name="pencil" size={28} color="#fff" />
                </LinearGradient>
                <Text style={ls.emptyTitle}>No notes yet</Text>
                <Text style={ls.emptyText}>
                  {search
                    ? "No results matched your search"
                    : "Tap + to create your first note"}
                </Text>
              </View>
            }
          />
        </>
      )}

      {exporting && (
        <View style={ls.exportOverlay}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={ls.exportText}>Generating PDF…</Text>
        </View>
      )}

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        actions={alertConfig.actions}
        onClose={hideAlert}
      />
    </View>
  );
}

// ── STYLES

const ls = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.text,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: "500",
    marginTop: 1,
  },
  addBtn: { marginLeft: 8 },
  addBtnGrad: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  statsBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  statItem: { flex: 1, alignItems: "center", paddingVertical: 10 },
  statDiv: { borderRightWidth: 1, borderRightColor: C.border },
  statVal: { fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  statLbl: {
    fontSize: 9,
    color: C.textLight,
    marginTop: 1,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderText: { color: C.textMuted, fontSize: 14, fontWeight: "600" },
  searchRow: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 14 },
  chips: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: C.border,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontSize: 11, fontWeight: "700", color: C.textMuted },
  chipTextActive: { color: "#fff" },
  chipBadge: {
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  chipBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  chipBadgeText: { fontSize: 9, fontWeight: "700", color: C.textMuted },
  empty: { alignItems: "center", paddingTop: 70, gap: 14 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  emptyText: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  exportOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,248,239,0.93)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 999,
  },
  exportText: { color: C.dark, fontSize: 15, fontWeight: "700" },
});

const nc = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 13,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  pinStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.primary,
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 7,
  },
  pinText: { fontSize: 9, color: "#fff", fontWeight: "700" },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: C.text,
    marginBottom: 5,
    lineHeight: 19,
  },
  preview: {
    fontSize: 11.5,
    color: C.textMuted,
    lineHeight: 17,
    marginBottom: 7,
  },
  checkPreview: { marginBottom: 7 },
  checkBar: {
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 3,
  },
  checkFill: { height: 3, backgroundColor: C.primary, borderRadius: 2 },
  checkCount: { fontSize: 9.5, color: C.textMuted, fontWeight: "600" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  date: { fontSize: 9.5, color: C.textLight, fontWeight: "600" },
  time: { fontSize: 9, color: C.textLight, marginTop: 1 },
  footerActions: { flexDirection: "row", gap: 4 },
  iconBtn: {
    width: 27,
    height: 27,
    borderRadius: 8,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
});

const ed = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: C.primary,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  tabActive: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderColor: C.border,
  },
  tabText: { fontSize: 12, fontWeight: "600", color: C.textLight },
  tabTextActive: { color: C.dark },
  charCount: {
    marginLeft: "auto",
    fontSize: 10,
    color: C.textLight,
    fontWeight: "500",
  },
  titleInput: {
    fontSize: 22,
    fontWeight: "800",
    color: C.text,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    letterSpacing: -0.3,
  },
  contentInput: {
    fontSize: 15,
    color: C.text,
    lineHeight: 24,
    padding: 16,
    minHeight: 220,
  },
  updatedBadge: {
    position: "absolute",
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  updatedText: { fontSize: 9, color: C.textLight, fontWeight: "600" },
});

const cl = StyleSheet.create({
  wrap: { padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  heading: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    flex: 1,
  },
  count: { fontSize: 11, color: C.textLight, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    paddingVertical: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: C.primary, borderColor: C.primary },
  itemText: { flex: 1, fontSize: 14, color: C.text, lineHeight: 20 },
  itemDone: { textDecorationLine: "line-through", color: C.textLight },
  removeBtn: { padding: 4 },
  progressBar: {
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 14,
    marginTop: 4,
  },
  progressFill: { height: 3, backgroundColor: C.primary, borderRadius: 2 },
  addRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  addInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});

const al = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(61,31,10,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  box: {
    backgroundColor: "#fff",
    borderRadius: 26,
    width: "100%",
    maxWidth: 310,
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 20,
    overflow: "hidden",
  },
  accentBar: { height: 4, backgroundColor: C.primary },
  iconWrap: { alignItems: "center", marginTop: 20, marginBottom: 14 },
  iconRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF3CD",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: 6,
    paddingHorizontal: 20,
  },
  message: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
    paddingHorizontal: 20,
  },
  divider: { height: 1, backgroundColor: C.border, marginBottom: 14 },
  actions: { gap: 8, paddingHorizontal: 16, paddingBottom: 18 },
  btn: {
    paddingVertical: 13,
    borderRadius: 13,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.border,
    flexDirection: "row",
    justifyContent: "center",
  },
  btnDefault: { backgroundColor: C.primary, borderColor: C.primary },
  btnDanger: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  btnCancel: { backgroundColor: C.bg, borderColor: C.border },
  btnText: { fontSize: 14, fontWeight: "700", color: C.text },
  btnTextDanger: { color: "#dc2626" },
  btnTextCancel: { color: C.textMuted },
});