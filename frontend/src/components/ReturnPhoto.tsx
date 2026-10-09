import React, { useState } from "react";
import { ActivityIndicator, Alert, Image, TouchableOpacity, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../services/api";

export default function ReturnPhoto({ id, exists, editable = false }: { id: string; exists: boolean; editable?: boolean }) {
  const [uri, setUri] = useState("");
  const [attached, setAttached] = useState(exists);
  const [busy, setBusy] = useState(false);
  const upload = async (camera: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert("Permission needed", "Allow photo access in your device settings."); return; }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.8 };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets[0];
      const image = await ImageManipulator.manipulateAsync(asset.uri, [{ resize: asset.width >= asset.height ? { width: 1000 } : { height: 1000 } }], { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      if (!image.base64 || image.base64.length > 1400000) throw new Error("Photo is too large. Please choose a smaller photo.");
      await api.uploadReturnPhoto(id, image.base64);
      setAttached(true); setUri(image.uri);
    } catch (e: any) { Alert.alert("Photo unavailable", e?.message || "Please try again."); }
    finally { setBusy(false); }
  };
  const view = async () => {
    setBusy(true);
    try { setUri((await api.getReturnPhoto(id)).uri); }
    catch { Alert.alert("Photo unavailable", "Could not load the photo. Please try again."); }
    finally { setBusy(false); }
  };
  if (!editable && !exists && !attached) return null;
  return <View style={{ marginTop: 12, gap: 10 }}>
    {uri ? <Image accessibilityLabel="Pickup evidence" source={{ uri }} resizeMode="contain" style={{ width: "100%", height: 240, borderRadius: 8, backgroundColor: "#F5F5F5" }} /> : null}
    <TouchableOpacity disabled={busy} accessibilityRole="button" onPress={() => exists || attached ? void view() : Alert.alert("Pickup photo", "Attach a clear photo of the collected bottles or items.", [{ text: "Camera", onPress: () => void upload(true) }, { text: "Photo Library", onPress: () => void upload(false) }, { text: "Cancel", style: "cancel" }])} style={{ minHeight: 44, padding: 12, borderRadius: 8, borderColor: "#E9DED4", borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
      {busy ? <ActivityIndicator color="#BB6B3F" /> : <Ionicons name="camera-outline" size={20} color="#BB6B3F" />}<Text style={{ color: "#BB6B3F", fontWeight: "600" }}>{exists || attached ? "View Pickup Photo" : "Add Pickup Photo"}</Text>
    </TouchableOpacity>
  </View>;
}
