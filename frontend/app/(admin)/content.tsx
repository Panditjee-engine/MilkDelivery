import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../../src/services/api";

const C = {
  bg: "#FFF8F4",
  card: "#fff",
  primary: "#FF9675",
  dark: "#BB6B3F",
  accent: "#8B6854",
  muted: "#A07850",
  light: "#C9A882",
  peach: "#FFF3E8",
  deepPeach: "#FFE8D6",
  text: "#1A1A1A",
  border: "#FFF0E8",
  success: "#388E3C",
  danger: "#dc2626",
};

type AdminContent = {
  id?: string;
  _id?: string;
  content_id?: string;
  title: string;
  description: string;
  images?: string[];
  is_active?: boolean;
};

type ContentDraft = {
  id: string | null;
  title: string;
  description: string;
  images: string[];
  is_active: boolean;
};

const emptyDraft: ContentDraft = {
  id: null,
  title: "",
  description: "",
  images: [],
  is_active: true,
};

function getContentId(item: AdminContent) {
  return String(item.id || item._id || item.content_id || "");
}

function normalizeImageUri(img: string) {
  if (!img) return "";
  if (img.startsWith("http") || img.startsWith("data:image")) return img;
  return `data:image/jpeg;base64,${img}`;
}

export default function AdminContentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string }>();
  const [items, setItems] = useState<AdminContent[]>([]);
  const [draft, setDraft] = useState<ContentDraft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadContent = useCallback(async () => {
    try {
      const res = await api.getContent();
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch (error: any) {
      Alert.alert("Content Load Failed", error?.message || "Could not load content.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const goBack = useCallback(() => {
    if (params.from === "settings") {
      router.replace("/(admin)/settings" as any);
      return;
    }
    router.back();
  }, [params.from, router]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        goBack();
        return true;
      });
      return () => sub.remove();
    }, [goBack]),
  );

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Needed", "Please allow photo access to add content images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      base64: true,
      quality: 0.72,
    });
    if (result.canceled) return;
    const images = result.assets
      .map((asset) => asset.base64)
      .filter(Boolean) as string[];
    setDraft((current) => ({
      ...current,
      images: [...current.images, ...images],
    }));
  };

  const saveContent = async () => {
    if (!draft.title.trim() || !draft.description.trim()) {
      Alert.alert("Missing Details", "Please enter both title and description.");
      return;
    }
    setSaving(true);
    try {
      if (draft.id) {
        await api.updateContent(draft.id, {
          title: draft.title.trim(),
          description: draft.description.trim(),
          images: draft.images,
          is_active: draft.is_active,
          updated_at: new Date().toISOString(),
        });
      } else {
        await api.addContent({
          title: draft.title.trim(),
          description: draft.description.trim(),
          images: draft.images,
        });
      }
      setDraft(emptyDraft);
      await loadContent();
      Alert.alert("Saved", "Content saved successfully.");
    } catch (error: any) {
      Alert.alert("Save Failed", error?.message || "Could not save content.");
    } finally {
      setSaving(false);
    }
  };

  const confirmEdit = (item: AdminContent) => {
    Alert.alert("Edit Content?", "This will load selected content into the form.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Edit",
        onPress: () =>
          setDraft({
            id: getContentId(item),
            title: item.title || "",
            description: item.description || "",
            images: item.images || [],
            is_active: item.is_active ?? true,
          }),
      },
    ]);
  };

  const confirmToggle = (item: AdminContent) => {
    const id = getContentId(item);
    if (!id) return;
    const willActivate = item.is_active === false;
    Alert.alert(
      willActivate ? "Activate Content?" : "Deactivate Content?",
      willActivate
        ? "This content will become visible again."
        : "This content will be hidden from active content.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: willActivate ? "Activate" : "Deactivate",
          onPress: async () => {
            try {
              await api.toggleContentStatus(id);
              await loadContent();
            } catch (error: any) {
              Alert.alert("Update Failed", error?.message || "Could not update status.");
            }
          },
        },
      ],
    );
  };

  const confirmDelete = (item: AdminContent) => {
    const id = getContentId(item);
    if (!id) return;
    Alert.alert("Delete Content?", "This content will be permanently deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteContent(id);
            await loadContent();
          } catch (error: any) {
            Alert.alert("Delete Failed", error?.message || "Could not delete content.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={20} color={C.dark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>App Content</Text>
          <Text style={s.subtitle}>Manage customer app banners and highlights</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadContent();
              }}
              tintColor={C.primary}
            />
          }
        >
          <View style={s.formCard}>
            <View style={s.formHead}>
              <View style={s.formIcon}>
                <Ionicons name="images-outline" size={18} color={C.dark} />
              </View>
              <View>
                <Text style={s.formTitle}>
                  {draft.id ? "Update Content" : "Add Content"}
                </Text>
                <Text style={s.formSub}>Title, description and base64 images</Text>
              </View>
            </View>

            <Text style={s.label}>Title</Text>
            <TextInput
              style={s.input}
              value={draft.title}
              onChangeText={(title) => setDraft((current) => ({ ...current, title }))}
              placeholder="Content title"
              placeholderTextColor={C.light}
            />

            <Text style={s.label}>Description</Text>
            <TextInput
              style={[s.input, s.descriptionInput]}
              value={draft.description}
              onChangeText={(description) =>
                setDraft((current) => ({ ...current, description }))
              }
              placeholder="Content description"
              placeholderTextColor={C.light}
              multiline
            />

            <View style={s.imageRowTop}>
              <Text style={s.label}>Images</Text>
              <TouchableOpacity style={s.addImageBtn} onPress={pickImages}>
                <Ionicons name="image-outline" size={15} color={C.dark} />
                <Text style={s.addImageText}>Add Image</Text>
              </TouchableOpacity>
            </View>

            {draft.images.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.previewRow}
              >
                {draft.images.map((img, index) => (
                  <View key={`${img.slice(0, 12)}-${index}`} style={s.thumbWrap}>
                    <Image source={{ uri: normalizeImageUri(img) }} style={s.thumb} />
                    <TouchableOpacity
                      style={s.removeThumb}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          images: current.images.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      <Ionicons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={s.emptyImages}>
                <Ionicons name="image-outline" size={20} color={C.light} />
                <Text style={s.emptyText}>No images selected</Text>
              </View>
            )}

            <View style={s.formActions}>
              {draft.id ? (
                <TouchableOpacity style={s.cancelBtn} onPress={() => setDraft(emptyDraft)}>
                  <Text style={s.cancelText}>Cancel Edit</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.65 }]}
                onPress={saveContent}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={s.saveText}>{draft.id ? "Update" : "Save"}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.listHeader}>
            <Text style={s.listTitle}>All Content</Text>
            <View style={s.countPill}>
              <Text style={s.countText}>{items.length}</Text>
            </View>
          </View>

          {loading ? (
            <View style={s.centerBox}>
              <ActivityIndicator color={C.primary} />
              <Text style={s.centerText}>Loading content...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={s.centerBox}>
              <Ionicons name="document-text-outline" size={28} color={C.light} />
              <Text style={s.centerText}>No content added yet</Text>
            </View>
          ) : (
            items.map((item) => (
              <View key={getContentId(item) || item.title} style={s.itemCard}>
                <View style={s.itemTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={s.itemDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.statusPill,
                      item.is_active === false && s.statusPillOff,
                    ]}
                  >
                    <Text
                      style={[
                        s.statusText,
                        item.is_active === false && s.statusTextOff,
                      ]}
                    >
                      {item.is_active === false ? "Inactive" : "Active"}
                    </Text>
                  </View>
                </View>

                {(item.images || []).length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.itemImages}
                  >
                    {(item.images || []).slice(0, 5).map((img, index) => (
                      <Image
                        key={`${getContentId(item)}-${index}`}
                        source={{ uri: normalizeImageUri(img) }}
                        style={s.itemImage}
                      />
                    ))}
                  </ScrollView>
                ) : null}

                <View style={s.actionRow}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => confirmEdit(item)}>
                    <Ionicons name="pencil-outline" size={14} color={C.dark} />
                    <Text style={s.actionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={() => confirmToggle(item)}>
                    <Ionicons name="power-outline" size={14} color={C.dark} />
                    <Text style={s.actionText}>Toggle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.deleteBtn]}
                    onPress={() => confirmDelete(item)}
                  >
                    <Ionicons name="trash-outline" size={14} color={C.danger} />
                    <Text style={[s.actionText, { color: C.danger }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.deepPeach,
  },
  title: { fontSize: 22, fontWeight: "900", color: C.text },
  subtitle: { fontSize: 12, fontWeight: "600", color: C.muted, marginTop: 2 },
  scroll: { paddingHorizontal: 16, paddingBottom: 36 },
  formCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: C.deepPeach,
    shadowColor: C.dark,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  formHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  formIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  formTitle: { fontSize: 16, fontWeight: "900", color: C.text },
  formSub: { fontSize: 11, color: C.muted, fontWeight: "600", marginTop: 2 },
  label: {
    fontSize: 11,
    fontWeight: "900",
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFDFB",
    borderWidth: 1,
    borderColor: C.deepPeach,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    marginBottom: 14,
  },
  descriptionInput: { minHeight: 96, textAlignVertical: "top", paddingTop: 12 },
  imageRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.peach,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  addImageText: { fontSize: 11, fontWeight: "800", color: C.dark },
  previewRow: { gap: 10, paddingVertical: 8 },
  thumbWrap: {
    width: 76,
    height: 76,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: C.peach,
  },
  thumb: { width: "100%", height: "100%" },
  removeThumb: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.58)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyImages: {
    height: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: C.deepPeach,
    backgroundColor: "#FFFDFB",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 14,
  },
  emptyText: { fontSize: 12, fontWeight: "700", color: C.light },
  formActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: C.peach,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 13, fontWeight: "900", color: C.dark },
  saveBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  saveText: { fontSize: 13, fontWeight: "900", color: "#fff" },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 12,
  },
  listTitle: { fontSize: 16, fontWeight: "900", color: C.text },
  countPill: {
    minWidth: 34,
    height: 30,
    borderRadius: 10,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  countText: { fontSize: 13, fontWeight: "900", color: C.dark },
  centerBox: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  centerText: { fontSize: 13, fontWeight: "700", color: C.light },
  itemCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.deepPeach,
    padding: 14,
    marginBottom: 12,
  },
  itemTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  itemTitle: { fontSize: 14, fontWeight: "900", color: C.text, marginBottom: 4 },
  itemDescription: { fontSize: 12, lineHeight: 16, color: C.muted, fontWeight: "600" },
  statusPill: {
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusPillOff: { backgroundColor: "#FEE2E2" },
  statusText: { fontSize: 10, fontWeight: "900", color: C.success },
  statusTextOff: { color: C.danger },
  itemImages: { gap: 8, paddingTop: 12 },
  itemImage: { width: 58, height: 58, borderRadius: 13, backgroundColor: C.peach },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 12,
    backgroundColor: C.peach,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  deleteBtn: { backgroundColor: "#FEE2E2" },
  actionText: { fontSize: 11, fontWeight: "900", color: C.dark },
});
